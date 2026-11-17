import { usePerfilActivo } from '../context/PerfilContext';
import useAuth from './useAuth';

/**
 * Comercios (mayoristas / minoristas) sobre los que el usuario logueado puede operar.
 *
 * Por qué existe: la API exige que el mayorista_id / minorista_id de un producto
 * pertenezca al usuario del token; si no, responde 403 "No autorizado para este
 * mayorista". Antes el formulario listaba TODOS los mayoristas, así que era muy
 * fácil elegir uno ajeno y comerse el 403 sin entender por qué.
 *
 * Esto vale también para el administrador: aunque ve todos los comercios, la
 * API no le da permiso de escribir productos de comercios ajenos (R-003 §3,
 * "Productos — alta/edición/baja: dueño del comercio", sin bypass de admin).
 *  - `opciones`: solo los comercios PROPIOS → para crear/editar/borrar.
 *  - `opcionesTodas`: todos los que el usuario puede ver (el admin, todos) →
 *    para mostrar nombres y filtrar listados.
 *
 * Los datos se cargan una sola vez en PerfilContext (los consultan el Sidebar,
 * los dashboards y los formularios); este hook solo los adapta al formato que
 * usan los componentes.
 *
 * @returns {{
 *   mayoristas: Array, minoristas: Array, opciones: Array, opcionesTodas: Array,
 *   loading: boolean, error: string|null, isAdmin: boolean, reload: Function
 * }}
 */
export const useMisComercios = () => {
  const {
    mayoristas,
    minoristas,
    loadingComercios,
    errorComercios,
    cargarComercios,
    isAdmin,
  } = usePerfilActivo();
  const { user } = useAuth();

  const esPropio = (c) => String(c.id_usuario) === String(user?.id);

  // Lista plana lista para un <select>, con el tipo de oferente incluido.
  const aOpciones = (mays, mins) => [
    ...mays.map((m) => ({
      tipo: 'mayorista',
      id: m.id,
      rubro_id: m.rubro_id,
      label: m.razon_social || `Mayorista #${m.id}`,
    })),
    ...mins.map((m) => ({
      tipo: 'minorista',
      id: m.id,
      rubro_id: m.rubro_id,
      label: m.razon_social || `Minorista #${m.id}`,
    })),
  ];

  const propiosMay = mayoristas.filter(esPropio);
  const propiosMin = minoristas.filter(esPropio);

  return {
    mayoristas: propiosMay,
    minoristas: propiosMin,
    opciones: aOpciones(propiosMay, propiosMin),
    opcionesTodas: aOpciones(mayoristas, minoristas),
    loading: loadingComercios,
    error: errorComercios,
    isAdmin,
    reload: cargarComercios,
  };
};

export default useMisComercios;
