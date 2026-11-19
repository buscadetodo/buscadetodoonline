import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon/Icon';
import './CarruselBanners.css';

const DESLIZ_MINIMO_PX = 40;

function prefiereMenosMovimiento() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Ruta del sitio con Link; dirección completa en otra pestaña. */
function EnlaceBanner({ link, children, ...rest }) {
  if (/^https?:\/\//i.test(link)) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={link} {...rest}>
      {children}
    </Link>
  );
}

function Banner({ banner, primero }) {
  const { titulo, texto, boton, link, imagen, imagenMovil, icono } = banner;
  const conTexto = !imagen || banner.conTexto !== false;
  const fondo = ['marino', 'azul', 'ambar'].includes(banner.fondo) ? banner.fondo : 'marino';

  const foto = imagen && (
    <picture className="carrusel-foto">
      {imagenMovil && <source media="(max-width: 640px)" srcSet={imagenMovil} />}
      <img
        src={imagen}
        alt={conTexto ? '' : titulo}
        loading={primero ? 'eager' : 'lazy'}
        decoding="async"
      />
    </picture>
  );

  // Foto que ya trae el texto dibujado: todo el banner es el enlace
  if (!conTexto) {
    return link ? (
      <EnlaceBanner link={link} className="carrusel-banner carrusel-banner-enlace">
        {foto}
      </EnlaceBanner>
    ) : (
      <div className="carrusel-banner">{foto}</div>
    );
  }

  return (
    <div className={`carrusel-banner carrusel-fondo-${fondo}${imagen ? ' carrusel-con-foto' : ''}`}>
      {foto}
      <div className="carrusel-texto">
        <h2>{titulo}</h2>
        {texto && <p>{texto}</p>}
        {boton && link && (
          <EnlaceBanner link={link} className="carrusel-boton">
            {boton}
          </EnlaceBanner>
        )}
      </div>
      {!imagen && icono && (
        <span className="carrusel-dibujo" aria-hidden="true">
          <Icon name={icono} />
        </span>
      )}
    </div>
  );
}

/**
 * Carrusel de banners grandes de la home, al estilo de los marketplaces:
 * pasa solo, tiene flechas, puntos y se desliza con el dedo.
 *
 * Accesibilidad: se frena con el mouse encima o con el foco adentro, tiene
 * botón de pausa (los contenidos que se mueven solos tienen que poder
 * frenarse), no pasa solo si el sistema pide menos movimiento, y los banners
 * que no se ven quedan fuera del orden del teclado y del lector de pantalla.
 *
 * @param banners    lista ya filtrada y ordenada (ver useBanners)
 * @param intervalo  milisegundos entre banner y banner
 */
function CarruselBanners({ banners, intervalo = 6000, className = '' }) {
  const total = banners.length;
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(prefiereMenosMovimiento);
  const [retenido, setRetenido] = useState(false);
  const [oculta, setOculta] = useState(() => typeof document !== 'undefined' && document.hidden);
  const toqueX = useRef(null);

  const ir = useCallback((i) => setActual(((i % total) + total) % total), [total]);
  const anterior = () => ir(actual - 1);
  const siguiente = () => ir(actual + 1);

  // Si la lista se achica (al venir de la API), no quedar en un banner que no existe
  useEffect(() => {
    if (actual >= total) setActual(0);
  }, [actual, total]);

  useEffect(() => {
    const alCambiar = () => setOculta(document.hidden);
    document.addEventListener('visibilitychange', alCambiar);
    return () => document.removeEventListener('visibilitychange', alCambiar);
  }, []);

  // Pasa solo. Depende de `actual`, así que moverlo a mano reinicia la espera.
  useEffect(() => {
    if (total < 2 || pausado || retenido || oculta) return undefined;
    const t = setTimeout(() => setActual((a) => (a + 1) % total), intervalo);
    return () => clearTimeout(t);
  }, [actual, total, pausado, retenido, oculta, intervalo]);

  if (total === 0) return null;

  const alTeclado = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      anterior();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      siguiente();
    }
  };

  const alSalirFoco = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setRetenido(false);
  };

  const alEmpezarToque = (e) => {
    toqueX.current = e.touches[0].clientX;
    setRetenido(true);
  };

  const alTerminarToque = (e) => {
    const inicio = toqueX.current;
    toqueX.current = null;
    setRetenido(false);
    if (inicio == null) return;
    const dx = e.changedTouches[0].clientX - inicio;
    if (dx > DESLIZ_MINIMO_PX) anterior();
    else if (dx < -DESLIZ_MINIMO_PX) siguiente();
  };

  return (
    <section
      className={`carrusel ${className}`.trim()}
      aria-roledescription="carrusel"
      aria-label="Novedades"
      onMouseEnter={() => setRetenido(true)}
      onMouseLeave={() => setRetenido(false)}
      onFocus={() => setRetenido(true)}
      onBlur={alSalirFoco}
      onKeyDown={total > 1 ? alTeclado : undefined}
    >
      <div
        className="carrusel-ventana"
        onTouchStart={total > 1 ? alEmpezarToque : undefined}
        onTouchEnd={total > 1 ? alTerminarToque : undefined}
        onTouchCancel={() => setRetenido(false)}
      >
        <div className="carrusel-pista" style={{ transform: `translateX(-${actual * 100}%)` }}>
          {banners.map((b, i) => {
            const visible = i === actual;
            return (
              <div
                key={b.id ?? i}
                className="carrusel-item"
                role="group"
                aria-roledescription="banner"
                aria-label={`${i + 1} de ${total}`}
                aria-hidden={!visible}
                inert={!visible}
              >
                <Banner banner={b} primero={i === 0} />
              </div>
            );
          })}
        </div>
      </div>

      {total > 1 && (
        <>
          <button type="button" className="carrusel-flecha carrusel-flecha-ant" onClick={anterior} aria-label="Banner anterior">
            <Icon name="anterior" />
          </button>
          <button type="button" className="carrusel-flecha carrusel-flecha-sig" onClick={siguiente} aria-label="Banner siguiente">
            <Icon name="siguiente" />
          </button>

          <div className="carrusel-controles">
            <button
              type="button"
              className="carrusel-pausa"
              onClick={() => setPausado((p) => !p)}
              aria-label={pausado ? 'Pasar los banners solos' : 'Frenar los banners'}
            >
              <Icon name={pausado ? 'reproducir' : 'pausa'} />
            </button>
            <div className="carrusel-puntos">
              {banners.map((b, i) => (
                <button
                  key={b.id ?? i}
                  type="button"
                  className={`carrusel-punto${i === actual ? ' activo' : ''}`}
                  onClick={() => ir(i)}
                  aria-label={`Ver banner ${i + 1} de ${total}`}
                  aria-current={i === actual ? 'true' : undefined}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default CarruselBanners;
