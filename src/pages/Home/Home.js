import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { usePerfilActivo } from '../../context/PerfilContext';
import Modal from '../../components/Modal/Modal';
import Footer from '../../components/Footer/Footer';
import Icon from '../../components/Icon/Icon';
import './Home.css';

function Home() {
  const { isAuthenticated } = useAuth();
  // panelUrl ya resuelve admin vs. panel del perfil (ver PerfilContext)
  const { panelUrl, loading: cargandoPerfiles } = usePerfilActivo();
  const [codigoPostal, setCodigoPostal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [accionLogin, setAccionLogin] = useState('');
  const [detectandoUbicacion, setDetectandoUbicacion] = useState(false);
  const [ubicacionError, setUbicacionError] = useState('');
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [ubicacionModalData, setUbicacionModalData] = useState({ tipo: '', mensaje: '', detalles: '' });

  const categorias = [
    { nombre: 'Alimentos', icon: 'alimentos' },
    { nombre: 'Bebidas', icon: 'bebidas' },
    { nombre: 'Limpieza', icon: 'limpieza' },
    { nombre: 'Mascotas', icon: 'mascotas' }
  ];

  // El landing público no muestra productos ni mayoristas de ejemplo: eran
  // datos inventados (con distancias falsas) y GET /productos/ y
  // GET /mayoristas/ exigen token. En su lugar se explica cómo funciona.
  const PASOS = [
    { icon: 'user', titulo: 'Creá tu cuenta gratis', texto: 'Registrate como comprador, comercio o transportista en un par de minutos.' },
    { icon: 'search', titulo: 'Buscá por rubro', texto: 'Recorré el catálogo de productos por mayor con precio y stock actualizados.' },
    { icon: 'mayorista', titulo: 'Compará comercios', texto: 'Mirá precio, stock y pedido mínimo de cada mayorista y minorista antes de decidir.' },
  ];

  const detectarUbicacion = async () => {
    // Limpiar error anterior
    setUbicacionError('');
    
    // Verificar soporte de geolocalización
    if (!navigator.geolocation) {
      setUbicacionError('Tu navegador no soporta geolocalización');
      setUbicacionModalData({
        tipo: 'error',
        mensaje: 'Navegador no compatible',
        detalles: 'Tu navegador no soporta la detección de ubicación automática. Por favor, ingresá tu código postal manualmente.'
      });
      setShowUbicacionModal(true);
      return;
    }

    setDetectandoUbicacion(true);

    try {
      // Obtener posición del usuario
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Hacer reverse geocoding con Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener la dirección');
      }

      const data = await response.json();
      
      // Extraer información de la dirección
      const address = data.address || {};
      const postalCode = address.postcode || address.postal_code || '';
      const city = address.city || address.town || address.village || '';
      
      // Si hay código postal, usarlo
      if (postalCode) {
        setCodigoPostal(postalCode);
        setUbicacionModalData({
          tipo: 'success',
          mensaje: '¡Ubicación detectada!',
          detalles: `${data.display_name}\n\nCódigo Postal: ${postalCode}`
        });
        setShowUbicacionModal(true);
      } else if (city) {
        // Si no hay CP pero hay ciudad, mostrar la ciudad
        setCodigoPostal(city);
        setUbicacionModalData({
          tipo: 'success',
          mensaje: '¡Ubicación detectada!',
          detalles: `${data.display_name}\n\nNota: No se pudo obtener el código postal exacto, pero estás en ${city}`
        });
        setShowUbicacionModal(true);
      } else {
        // Mostrar la dirección completa
        const displayAddress = data.display_name || `${latitude}, ${longitude}`;
        setCodigoPostal(displayAddress.split(',')[0]);
        setUbicacionModalData({
          tipo: 'success',
          mensaje: '¡Ubicación detectada!',
          detalles: `${displayAddress}\n\nPodés ajustar manualmente tu ubicación en el campo de búsqueda.`
        });
        setShowUbicacionModal(true);
      }

    } catch (error) {
      console.error('Error al detectar ubicación:', error);
      
      // Mensajes de error específicos
      let mensaje = '';
      let detalles = '';

      if (error.code) {
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            mensaje = 'Permiso de ubicación denegado';
            detalles = 'Has denegado el permiso de ubicación.\n\nPara usar esta función, debés permitir el acceso a tu ubicación en la configuración de tu navegador.';
            break;
          case 2: // POSITION_UNAVAILABLE
            mensaje = 'Ubicación no disponible';
            detalles = 'No se pudo determinar tu ubicación.\n\nVerificá tu conexión a internet y que los servicios de ubicación estén activados.';
            break;
          case 3: // TIMEOUT
            mensaje = 'Tiempo agotado';
            detalles = 'Se agotó el tiempo de espera para detectar tu ubicación.\n\nIntentá nuevamente o ingresá tu código postal manualmente.';
            break;
          default:
            mensaje = 'Error desconocido';
            detalles = 'Error desconocido al detectar la ubicación.\n\nPor favor, ingresá tu código postal manualmente.';
        }
      } else {
        mensaje = 'Error al procesar';
        detalles = 'Error al procesar la ubicación.\n\nPor favor, ingresá tu código postal manualmente.';
      }

      setUbicacionError(mensaje);
      setUbicacionModalData({
        tipo: 'error',
        mensaje: mensaje,
        detalles: detalles
      });
      setShowUbicacionModal(true);
    } finally {
      setDetectandoUbicacion(false);
    }
  };

  // Sin sesión, estas acciones llevan a crear cuenta: el modal dice para qué
  const MOTIVOS_LOGIN = {
    buscar: 'Para buscar en el catálogo, ingresá a tu cuenta',
    categoria: 'Para explorar por rubro, ingresá a tu cuenta',
  };

  const handleActionRequiresLogin = (action) => {
    setAccionLogin(action);
    setShowLoginModal(true);
  };

  // Modal de ubicación: es el mismo con y sin sesión
  const cerrarUbicacionModal = () => setShowUbicacionModal(false);
  const modalUbicacion = showUbicacionModal && (
    <Modal
      onClose={cerrarUbicacionModal}
      titleId="ubicacion-modal-titulo"
      overlayClassName="modal-overlay"
      className="modal-content ubicacion-modal"
    >
      <div
        className={`modal-icon ${ubicacionModalData.tipo === 'success' ? 'success' : 'error'}`}
        aria-hidden="true"
      >
        <Icon name={ubicacionModalData.tipo === 'success' ? 'success' : 'warning'} />
      </div>
      <h3 id="ubicacion-modal-titulo">{ubicacionModalData.mensaje}</h3>
      <p style={{ whiteSpace: 'pre-line' }}>{ubicacionModalData.detalles}</p>
      <button className="btn-modal-ubicacion-ok" onClick={cerrarUbicacionModal}>
        Entendido
      </button>
      <button className="modal-close" onClick={cerrarUbicacionModal} aria-label="Cerrar">
        <Icon name="close" />
      </button>
    </Modal>
  );

  // Con sesión, "/" lleva al panel del usuario. Antes había acá una segunda
  // "home" con otra barra (botón verde "Panel", rojo "Salir") que repetía lo
  // del panel con otro diseño: dos inicios distintos para lo mismo.
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

  // Vista para usuarios NO autenticados
  return (
    <div className="home-public-container">
      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon"><Icon name="minorista" /></span>
            <span className="logo-text">BuscaDeTodoOnline</span>
          </div>
          <div className="header-actions">
            <Link to="/login" className="btn-login">
              <span className="btn-login-full">Iniciar sesión / Registrarse</span>
              <span className="btn-login-short">Ingresar</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Zona */}
      <section className="zona-section">
        <div className="container">
          <h1 className="home-hero-title">Comprá por mayor cerca de tu zona</h1>
          <p className="home-hero-subtitle">
            Mayoristas, minoristas y fleteros en un solo lugar
          </p>
          <label htmlFor="zona-input" className="field-label">
            Tu zona
          </label>
          <div className="zona-input-group">
            <span className="zona-icon"><Icon name="location" /></span>
            <input
              id="zona-input"
              type="text"
              placeholder="Código postal o ciudad"
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
              className="zona-input"
              disabled={detectandoUbicacion}
            />
            <button 
              onClick={detectarUbicacion} 
              className={`btn-detectar ${detectandoUbicacion ? 'loading' : ''}`}
              disabled={detectandoUbicacion}
            >
              {detectandoUbicacion ? (
                <>
                  <span className="spinner-icon"><Icon name="loading" /></span>
                  <span>Detectando...</span>
                </>
              ) : (
                <>
                  <Icon name="location" />
                  <span>Detectar ubicación</span>
                </>
              )}
            </button>
          </div>
          {ubicacionError && (
            <div className="ubicacion-error-hint">
              <Icon name="warning" />
              <span>{ubicacionError}. Ingresá tu código postal manualmente.</span>
            </div>
          )}
        </div>
      </section>

      {/* Buscador */}
      <section className="search-section">
        <div className="container">
          <label htmlFor="search-input" className="field-label">
            Buscar productos
          </label>
          <form
            className="search-box"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              handleActionRequiresLogin('buscar');
            }}
          >
            <span className="search-icon"><Icon name="search" /></span>
            <input
              id="search-input"
              type="search"
              placeholder="Productos por mayor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn-buscar">
              <Icon name="lock" /> Ingresá para buscar
            </button>
          </form>
        </div>
      </section>

      {/* Categorías */}
      <section className="categorias-section">
        <div className="container">
          <h2 className="section-heading"><Icon name="folder" /> Categorías</h2>
          <p className="section-hint">
            <Icon name="lock" /> Ingresá para explorar el catálogo por rubro.
          </p>
          <div className="categorias-grid">
            {categorias.map((cat, index) => (
              <button
                key={index}
                className="categoria-card"
                onClick={() => handleActionRequiresLogin('categoria')}
                aria-label={`${cat.nombre}: ingresá para ver el rubro`}
              >
                <span className="categoria-icon"><Icon name={cat.icon} /></span>
                <span className="categoria-nombre">{cat.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="como-funciona-section" aria-labelledby="como-funciona-titulo">
        <div className="container">
          <h2 id="como-funciona-titulo" className="section-heading">Cómo funciona</h2>
          <ol className="pasos-grid">
            {PASOS.map((paso, i) => (
              <li key={paso.titulo} className="paso-card">
                <span className="paso-numero" aria-hidden="true">{i + 1}</span>
                <span className="paso-icono" aria-hidden="true"><Icon name={paso.icon} /></span>
                <h3>{paso.titulo}</h3>
                <p>{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Invitación a vender: lo que más necesita un marketplace que arranca es oferta */}
      <section className="vender-section" aria-labelledby="vender-titulo">
        <div className="container">
        <div className="vender-contenido">
          <div className="vender-texto">
            <h2 id="vender-titulo">¿Tenés un comercio o una distribuidora?</h2>
            <p>Publicá tu catálogo y llegá a comercios y compradores de tu zona.</p>
            <ul className="vender-beneficios">
              <li><Icon name="success" /> Crear tu cuenta es gratis</li>
              <li><Icon name="success" /> Cargá productos con precio y stock en minutos</li>
              <li><Icon name="success" /> Definí tu pedido mínimo y si hacés retiro en local</li>
            </ul>
          </div>
          <div className="vender-acciones">
            <Link to="/registro/mayorista" className="btn-vender-primario">
              <Icon name="mayorista" /> Registrar mi comercio
            </Link>
            <Link to="/registro/transportista" className="btn-vender-secundario">
              <Icon name="transportista" /> Soy transportista
            </Link>
          </div>
        </div>
        </div>
      </section>

      {/* Modal Login Required */}
      {showLoginModal && (
        <Modal
          onClose={() => setShowLoginModal(false)}
          titleId="login-modal-titulo"
          overlayClassName="modal-overlay"
          className="modal-content"
        >
          <div className="modal-icon"><Icon name="lock" /></div>
          <h3 id="login-modal-titulo">
            {MOTIVOS_LOGIN[accionLogin] || 'Para continuar, ingresá a tu cuenta'}
          </h3>
          <p>Si todavía no tenés cuenta, registrarte es gratis.</p>
          <div className="modal-actions">
            <Link to="/registro" className="btn-modal-primary">
              Registrarse
            </Link>
            <Link to="/login" className="btn-modal-secondary">
              Ya tengo cuenta
            </Link>
          </div>
          <button
            className="modal-close"
            onClick={() => setShowLoginModal(false)}
            aria-label="Cerrar"
          >
            <Icon name="close" />
          </button>
        </Modal>
      )}

      <Footer />

      {modalUbicacion}
    </div>
  );
}

export default Home;
