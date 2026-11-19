// Productos vistos recientemente, guardados en el navegador.
//
// Cada vez que se abre la ficha de un producto se guarda acá (el más reciente
// primero, sin repetir), para mostrar la fila "Vistos recientemente" y que la
// persona retome lo que estaba comparando. Como las búsquedas recientes, es
// una comodidad del navegador: no viaja al servidor y, si no se puede guardar
// (modo privado), la app sigue andando sin la fila.
//
// Se guarda una copia de los datos del producto para mostrar la tarjeta sin
// pedirla a la API. El precio y el stock de esa copia pueden haber cambiado:
// al abrirlo desde la fila se piden los actuales.

const CLAVE = 'buscadetodo-vistos';
const MAX_VISTOS = 12;
/** Evento de window que avisa que la lista cambió (en esta pestaña). */
export const EVENTO_VISTOS = 'buscadetodo-vistos';

const resumenDe = (p) => ({
  id: p.id,
  nombre: p.nombre,
  descripcion: p.descripcion,
  precio: p.precio,
  stock: p.stock,
  imagen_url: p.imagen_url,
  rubro_id: p.rubro_id,
  mayorista_id: p.mayorista_id,
  minorista_id: p.minorista_id,
});

export function leerVistos() {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE));
    return Array.isArray(lista) ? lista.filter((p) => p?.id != null).slice(0, MAX_VISTOS) : [];
  } catch {
    return [];
  }
}

const escribir = (lista) => {
  try {
    if (lista.length) localStorage.setItem(CLAVE, JSON.stringify(lista));
    else localStorage.removeItem(CLAVE);
  } catch {
    // sin almacenamiento: no se recuerdan, nada más
  }
  window.dispatchEvent(new Event(EVENTO_VISTOS));
};

/** Suma (o actualiza y sube al principio) un producto que se acaba de abrir. */
export function guardarVisto(producto) {
  if (producto?.id == null) return;
  const resto = leerVistos().filter((p) => String(p.id) !== String(producto.id));
  escribir([resumenDe(producto), ...resto].slice(0, MAX_VISTOS));
}

/** Saca un producto (por ejemplo, porque ya no está publicado). */
export function quitarVisto(id) {
  escribir(leerVistos().filter((p) => String(p.id) !== String(id)));
}

/** Borra todo el historial. */
export function borrarVistos() {
  escribir([]);
}

/** true si la clave de localStorage es la de los vistos (para escuchar otras pestañas). */
export const esClaveDeVistos = (clave) => clave === CLAVE;
