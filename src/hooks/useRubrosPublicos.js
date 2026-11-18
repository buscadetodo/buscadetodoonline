import { useEffect, useState } from 'react';
import rubrosService from '../services/rubrosService';

// GET /rubros/ es público. Se pide una sola vez por carga de la app y se
// comparte entre el encabezado, la búsqueda y las fichas (antes cada pantalla
// lo pedía por su cuenta).
let pedido = null;
let cache = null;

const cargar = () => {
  if (!pedido) {
    pedido = rubrosService
      .getAll(50, 0)
      .then((resp) => {
        const lista = resp?.data ?? resp;
        cache = Array.isArray(lista) ? lista.map((r) => ({ id: r.id, nombre: r.rubro })) : [];
        return cache;
      })
      .catch(() => {
        pedido = null; // se reintenta la próxima vez
        return [];
      });
  }
  return pedido;
};

/**
 * Rubros para mostrar y filtrar: [{ id, nombre }].
 * @returns {{ rubros: Array<{id:number,nombre:string}>, nombreRubro: (id) => string }}
 */
export function useRubrosPublicos() {
  const [rubros, setRubros] = useState(cache || []);

  useEffect(() => {
    if (cache) return undefined;
    let vigente = true;
    cargar().then((lista) => vigente && setRubros(lista));
    return () => {
      vigente = false;
    };
  }, []);

  const nombreRubro = (id) => rubros.find((r) => Number(r.id) === Number(id))?.nombre || '';
  return { rubros, nombreRubro };
}

export default useRubrosPublicos;
