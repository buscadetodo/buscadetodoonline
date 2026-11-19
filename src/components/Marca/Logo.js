import React from 'react';
import { NOMBRE_SITIO } from '../../config/sitio';
import './Logo.css';

// Colores del logo (los mismos que --color-marino y --color-azul de index.css;
// van fijos porque el dibujo también se usa fuera de la app: favicon, íconos).
const MARINO = '#0b2346';
const AZUL = '#147cff';

/**
 * Ícono de la marca: bolsa de compras con una lupa que encuentra una caja.
 * Redibujado en vector a partir del logo original (imagen del 2026-11-19).
 *
 * @param {'claro'|'oscuro'} [props.fondo] - sobre qué fondo va: en 'oscuro'
 *   la bolsa pasa a blanco para que se vea sobre el encabezado marino.
 * @param {number|string} [props.tamano] - alto y ancho
 */
export function LogoIcono({ fondo = 'claro', tamano = 40, className = '' }) {
  const bolsa = fondo === 'oscuro' ? '#ffffff' : MARINO;
  const separacion = fondo === 'oscuro' ? MARINO : '#ffffff';
  return (
    <svg
      className={`logo-icono ${className}`}
      width={tamano}
      height={tamano}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      {/* Manija y cuerpo de la bolsa */}
      <path d="M36 35 V25 a11 11 0 0 1 22 0 V35" fill="none" stroke={bolsa} strokeWidth="5" strokeLinecap="round" />
      <path d="M23 34 H71 Q75.5 34 76 38.5 L79.5 80 Q80 87 73 87 H19 Q12 87 12.5 80 L17 38.5 Q17.5 34 23 34 Z" fill={bolsa} />
      {/* Lupa: separación del color del fondo, aro azul, vidrio blanco */}
      <circle cx="66" cy="60" r="26" fill={separacion} />
      <circle cx="66" cy="60" r="20" fill="#ffffff" stroke={AZUL} strokeWidth="6.5" />
      <path d="M81 75 L92 86" stroke={AZUL} strokeWidth="8" strokeLinecap="round" />
      {/* Caja adentro de la lupa */}
      <path d="M66 47.5 L78 54 L66 60.5 L54 54 Z" fill={MARINO} />
      <path d="M54 54 L66 60.5 V74 L54 67.5 Z" fill={MARINO} />
      <path d="M66 60.5 L78 54 V67.5 L66 74 Z" fill="#06162d" />
      <path d="M59.4 51.3 L62.4 49.7 L74.4 56.2 L71.4 57.8 Z" fill="#ffffff" />
      <path d="M54 54 L66 60.5 L78 54 M66 60.5 V74" fill="none" stroke="#ffffff" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Logo completo: ícono + "Buscá" (marino) "detodo" (azul).
 * @param {'claro'|'oscuro'} [props.fondo]
 * @param {boolean} [props.soloNombre] - sin el ícono
 */
function Logo({ fondo = 'claro', tamano = 36, soloNombre = false, className = '' }) {
  return (
    <span className={`logo logo-${fondo} ${className}`} aria-label={NOMBRE_SITIO} role="img">
      {!soloNombre && <LogoIcono fondo={fondo} tamano={tamano} />}
      <span className="logo-nombre" aria-hidden="true">
        <span className="logo-busca">Buscá</span>
        <span className="logo-detodo">detodo</span>
      </span>
    </span>
  );
}

export default Logo;
