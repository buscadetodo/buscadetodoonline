// Validaciones de formato compartidas por los formularios.
//
// Informe QA 30/09: el email aceptaba casi cualquier texto (a'OR'1'='1@a.com)
// y la patente aceptaba HTML. Se sigue el modelo del DNI: se limpia mientras
// se escribe y se valida el formato al enviar.

// Usuario con letras, números y . _ % + -; dominio con al menos un punto y una
// terminación de 2 o más letras (ej.: nombre.apellido@empresa.com.ar).
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export const esEmailValido = (email) => EMAIL_REGEX.test(String(email || '').trim());

// Patentes argentinas: formato viejo ABC123 y Mercosur AB123CD.
const PATENTE_REGEX = /^(?:[A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;

export const PATENTE_MAX = 7;
export const PATENTE_AYUDA = 'Formato ABC123 o AB123CD';

/** Para el onChange: mayúsculas, sin espacios, guiones ni símbolos, hasta 7. */
export const normalizarPatente = (valor) =>
  String(valor || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, PATENTE_MAX);

export const esPatenteValida = (patente) => PATENTE_REGEX.test(normalizarPatente(patente));

// CUIT: el backend (R-003 §4) exige exactamente 11 dígitos, sin guiones.
// Se aceptan guiones o espacios al escribir y se limpian en el onChange,
// así "20-12345678-9" queda "20123456789". No se valida el dígito
// verificador porque el backend tampoco lo hace (rechazaríamos CUIT que la
// API acepta, como el de los ejemplos de la colección).
export const CUIT_LARGO = 11;
export const CUIT_AYUDA = '11 dígitos, sin guiones';

export const normalizarCuit = (valor) =>
  String(valor || '')
    .replace(/\D/g, '')
    .slice(0, CUIT_LARGO);

export const esCuitValido = (cuit) => /^\d{11}$/.test(String(cuit || '').trim());

// Textos libres: el backend (R-003 §4) rechaza con 422 cualquier texto que
// tenga < o >. Se valida antes de enviar para mostrar un mensaje claro.
export const TEXTO_SIN_HTML_AYUDA = 'no puede contener los caracteres < ni >';

export const tieneCaracteresHtml = (texto) => /[<>]/.test(String(texto ?? ''));

/**
 * Devuelve el mensaje de error del primer campo de texto que tenga < o >,
 * o null si están todos bien.
 * @param {Object} datos - valores del formulario
 * @param {Object} etiquetas - { nombreDelCampo: 'Etiqueta visible' }
 */
export const errorTextoConHtml = (datos, etiquetas) => {
  const campo = Object.keys(etiquetas).find((k) => tieneCaracteresHtml(datos?.[k]));
  return campo ? `${etiquetas[campo]} ${TEXTO_SIN_HTML_AYUDA}` : null;
};
