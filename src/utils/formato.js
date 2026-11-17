// Formatos de presentación compartidos.

/** "$ 4.500" / "$ 1.250,50". La API devuelve el precio como string ("4500.00"). */
export const formatearPrecio = (valor) => {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

/** "1.234" con separador de miles. */
export const formatearNumero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n.toLocaleString('es-AR') : '—';
};

/** Primer nombre para saludar ("María José" → "María"). */
export const primerNombre = (nombre) => String(nombre || '').trim().split(/\s+/)[0] || '';
