import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon/Icon';
import Logo from '../Marca/Logo';
import { NOMBRE_SITIO } from '../../config/sitio';
import useAuth from '../../hooks/useAuth';
import { useRubrosPublicos } from '../../hooks/useRubrosPublicos';
import { usePerfilActivo } from '../../context/PerfilContext';
import PerfilSelector from '../PerfilSelector/PerfilSelector';
import { EVENTO_UBICACION, leerUbicacion } from '../../utils/ubicacion';
import BuscadorInteligente from './BuscadorInteligente';
import MiniCarrito from './MiniCarrito';
import ModalZona from './ModalZona';
import './Tienda.css';

const RUBROS_EN_BARRA = 6;

/**
 * Encabezado de la tienda (home pública, búsqueda y pantallas del comprador).
 *
 * Sigue la estructura de los marketplaces grandes:
 *  - fila 1: marca · buscador grande · (escritorio) acceso a la cuenta
 *  - fila 2: zona · rubros · cuenta y carrito
 * En el celular: marca y carrito arriba, el buscador a todo el ancho y la
 * zona debajo; los rubros se eligen desde los filtros de la búsqueda.
 */
function EncabezadoTienda() {
  const { isAuthenticated } = useAuth();
  const { panelUrl } = usePerfilActivo();
  const { rubros } = useRubrosPublicos();

  const [zona, setZona] = useState(() => leerUbicacion()?.texto || '');
  const [eligiendoZona, setEligiendoZona] = useState(false);
  useEffect(() => {
    const actualizar = () => setZona(leerUbicacion()?.texto || '');
    window.addEventListener(EVENTO_UBICACION, actualizar);
    return () => window.removeEventListener(EVENTO_UBICACION, actualizar);
  }, []);

  const inicio = isAuthenticated ? panelUrl : '/';

  return (
    <header className="encabezado-tienda">
      <div className="encabezado-fila encabezado-fila-1">
        <Link to={inicio} className="encabezado-marca" aria-label={`${NOMBRE_SITIO}, inicio`}>
          <Logo fondo="oscuro" tamano={34} />
        </Link>

        <BuscadorInteligente />

        <div className="encabezado-carrito-movil">
          <MiniCarrito />
        </div>
      </div>

      <div className="encabezado-fila encabezado-fila-2">
        <button type="button" className="encabezado-zona" onClick={() => setEligiendoZona(true)}>
          <Icon name="location" />
          <span>
            <small>{zona ? 'Tu zona' : 'Elegí tu zona'}</small>
            <strong>{zona || 'Ver comercios cercanos'}</strong>
          </span>
        </button>

        <nav className="encabezado-rubros" aria-label="Rubros">
          <Link to="/buscar">Todos los productos</Link>
          {rubros.slice(0, RUBROS_EN_BARRA).map((r) => (
            <Link key={r.id} to={`/buscar?rubro=${r.id}`}>{r.nombre}</Link>
          ))}
          {isAuthenticated && <Link to="/mayoristas">Mayoristas</Link>}
        </nav>

        <div className="encabezado-cuenta">
          {isAuthenticated ? (
            <PerfilSelector />
          ) : (
            <>
              <Link to="/registro">Creá tu cuenta</Link>
              <Link to="/login">Ingresá</Link>
            </>
          )}
          <div className="encabezado-carrito-escritorio">
            <MiniCarrito />
          </div>
        </div>
      </div>

      {eligiendoZona && <ModalZona onClose={() => setEligiendoZona(false)} />}
    </header>
  );
}

export default EncabezadoTienda;
