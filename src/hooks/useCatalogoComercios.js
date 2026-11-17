import { useCallback, useEffect, useState } from 'react';
import mayoristasService from '../services/mayoristasService';
import minoristasService from '../services/minoristasService';

// La API no devuelve totales: se pide hasta este máximo por tipo.
const TOPE = 100;

/**
 * Catálogo de comercios (mayoristas y minoristas) para MOSTRAR nombres.
 *
 * Desde R-003 (devolución v1) cualquier usuario autenticado puede leer
 * GET /mayoristas/ y GET /minorista/: los ajenos vienen sin `cuit` ni
 * `id_usuario`. Antes un comprador no podía, y el catálogo de productos
 * mostraba "Minorista #2" en lugar del nombre del comercio.
 *
 * No sirve para decidir permisos (para eso, useMisComercios).
 *
 * @returns {{
 *   nombreDe: (producto: Object) => string,
 *   opciones: Array<{tipo: string, id: number, label: string}>,
 *   cargando: boolean
 * }}
 */
export const useCatalogoComercios = () => {
  const [mapa, setMapa] = useState({});
  const [opciones, setOpciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    const lista = (resp) => {
      const data = resp?.data ?? resp;
      return Array.isArray(data) ? data : [];
    };

    Promise.allSettled([
      mayoristasService.getAll({ limit: TOPE }),
      minoristasService.getAll({ limit: TOPE }),
    ]).then(([mays, mins]) => {
      if (!vigente) return;
      const nuevo = {};
      const ops = [];
      const sumar = (resp, tipo) => {
        if (resp.status !== 'fulfilled') return;
        lista(resp.value).forEach((m) => {
          const label = m.razon_social || `${tipo === 'mayorista' ? 'Mayorista' : 'Minorista'} #${m.id}`;
          nuevo[`${tipo}:${m.id}`] = label;
          ops.push({ tipo, id: m.id, label });
        });
      };
      sumar(mays, 'mayorista');
      sumar(mins, 'minorista');
      setMapa(nuevo);
      setOpciones(ops.sort((a, b) => a.label.localeCompare(b.label, 'es')));
      setCargando(false);
    });

    return () => {
      vigente = false;
    };
  }, []);

  /** Nombre del comercio que publica el producto ("" si no se conoce). */
  const nombreDe = useCallback(
    (producto) => {
      if (!producto) return '';
      if (producto.mayorista_id != null) return mapa[`mayorista:${producto.mayorista_id}`] || '';
      if (producto.minorista_id != null) return mapa[`minorista:${producto.minorista_id}`] || '';
      return '';
    },
    [mapa]
  );

  return { nombreDe, opciones, cargando };
};

export default useCatalogoComercios;
