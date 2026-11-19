import React, { useEffect, useState } from 'react';
import { useCatalogoComercios } from '../../hooks';
import productosService from '../../services/productosService';
import { borrarVistos, esClaveDeVistos, EVENTO_VISTOS, leerVistos, quitarVisto } from '../../utils/vistos';
import { useToast } from '../Toast/Toast';
import TarjetaProducto from './TarjetaProducto';
import './VistosRecientemente.css';

/**
 * Fila "Vistos recientemente": los últimos productos que abrió la persona en
 * este navegador (ver utils/vistos), para retomar lo que estaba comparando.
 * Se desliza de costado para no empujar el resto de la página.
 *
 * Al tocar uno se piden precio y stock actuales antes de abrir la ficha (la
 * copia guardada puede estar vieja). Si ya no está publicado, se saca de la
 * fila y se avisa.
 *
 * @param {Function} props.onAbrir - abre la ficha con el producto (la decide cada pantalla)
 * @param {string} [props.className] - clase de la sección de la pantalla que la usa
 * @param {string} [props.claseTitulo] - clase del título, para que combine con el resto
 */
function VistosRecientemente({ onAbrir, className = '', claseTitulo = '' }) {
  const [vistos, setVistos] = useState(leerVistos);
  const [abriendo, setAbriendo] = useState(null);
  const { nombreDe } = useCatalogoComercios();
  const toast = useToast();

  useEffect(() => {
    const releer = () => setVistos(leerVistos());
    const enOtra = (e) => esClaveDeVistos(e.key) && releer();
    window.addEventListener(EVENTO_VISTOS, releer);
    window.addEventListener('storage', enOtra);
    return () => {
      window.removeEventListener(EVENTO_VISTOS, releer);
      window.removeEventListener('storage', enOtra);
    };
  }, []);

  if (vistos.length === 0) return null;

  const abrir = async (guardado) => {
    if (abriendo) return;
    setAbriendo(guardado.id);
    try {
      const resp = await productosService.getById(guardado.id);
      const actual = resp?.data ?? resp;
      onAbrir(actual?.id ? actual : guardado);
    } catch (err) {
      if (err?.response?.status === 404) {
        quitarVisto(guardado.id);
        toast.info(`${guardado.nombre} ya no está publicado. Lo sacamos de tus vistos.`);
      } else {
        onAbrir(guardado); // sin conexión: se muestra lo guardado
      }
    } finally {
      setAbriendo(null);
    }
  };

  return (
    <section className={`vistos ${className}`} aria-labelledby="vistos-titulo">
      <div className="vistos-cabecera">
        <h2 id="vistos-titulo" className={claseTitulo}>Vistos recientemente</h2>
        <button type="button" className="vistos-borrar" onClick={borrarVistos}>
          Borrar historial
        </button>
      </div>
      <div className="vistos-fila" aria-busy={abriendo != null}>
        {vistos.map((p) => (
          <div key={p.id} className={`vistos-item ${abriendo === p.id ? 'abriendo' : ''}`}>
            <TarjetaProducto producto={p} comercio={nombreDe(p)} onAbrir={abrir} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default VistosRecientemente;
