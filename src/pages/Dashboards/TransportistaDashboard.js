import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useFichaComercial } from '../../hooks';
import { usePerfilActivo } from '../../context/PerfilContext';
import AvisoFichaComercial from '../../components/AvisoFichaComercial/AvisoFichaComercial';
import Icon from '../../components/Icon/Icon';
import { formatearPrecio } from '../../utils/formato';
import '../Dashboard/Dashboard.css';
import './Paneles.css';

/**
 * Panel del transportista.
 *
 * Antes mostraba "Solicitudes", "Viajes" e "Ingresos del mes" fijos en 0, y
 * accesos a "Configurar tarifas" y "Ver estadísticas" que llevaban a Mi Perfil.
 * Ahora muestra los datos reales de su vehículo y avisa que las solicitudes de
 * flete todavía no están disponibles.
 */
function TransportistaDashboard() {
  const { user } = useAuth();
  const { tiposFaltantes } = useFichaComercial();
  const { transportistas = [], loadingComercios } = usePerfilActivo();
  const sinFicha = tiposFaltantes.includes('transportista');

  const ficha = transportistas.find((t) => String(t.id_usuario) === String(user?.id));

  const datos = ficha
    ? [
        ['Vehículo', ficha.tipo_vehiculo || '—'],
        ['Patente', ficha.patente || '—'],
        ['Capacidad de carga', ficha.capacidad_carga || '—'],
        ['Refrigerado', ficha.refrigerado === 'y' ? 'Sí' : 'No'],
        ['Precio base', ficha.precio_base != null ? formatearPrecio(ficha.precio_base) : '—'],
        ['Precio por km', ficha.precio_por_km != null ? formatearPrecio(ficha.precio_por_km) : '—'],
      ]
    : [];

  return (
    <div className="dashboard">
      <header className="panel-encabezado">
        <h1><Icon name="transportista" /> Panel transportista</h1>
        <p>Los datos de tu vehículo y tus tarifas.</p>
      </header>

      <AvisoFichaComercial tipo="transportista" />

      {!sinFicha && (
        <section className="dashboard-section" aria-labelledby="transportista-datos">
          <div className="panel-seccion-cabecera">
            <h2 id="transportista-datos">Tu vehículo</h2>
            <Link to="/perfil" className="panel-link">Ir a Mi perfil →</Link>
          </div>
          <div className="panel-tarjeta">
            {loadingComercios ? (
              <div className="panel-datos" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="esqueleto esqueleto-linea" style={{ display: 'block' }} />
                ))}
              </div>
            ) : (
              <dl className="panel-datos">
                {datos.map(([etiqueta, valor]) => (
                  <div key={etiqueta}>
                    <dt>{etiqueta}</dt>
                    <dd>{valor}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      )}


      <div className="panel-aviso">
        <Icon name="transportista" />
        <span>
          <strong>Solicitudes de flete, próximamente.</strong> Cuando los compradores puedan pedir
          fletes, las solicitudes y tus viajes van a aparecer en este panel.
        </span>
      </div>
    </div>
  );
}

export default TransportistaDashboard;
