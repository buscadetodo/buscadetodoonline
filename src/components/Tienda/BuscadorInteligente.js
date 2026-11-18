import React, { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../Icon/Icon';
import productosService from '../../services/productosService';
import { useCatalogoComercios } from '../../hooks';
import { useRubrosPublicos } from '../../hooks/useRubrosPublicos';
import { formatearPrecio } from '../../utils/formato';
import {
  filtrarPorNombre,
  guardarReciente,
  leerRecientes,
  partesResaltadas,
  quitarReciente,
} from '../../utils/busqueda';
import FichaSegunSesion from './FichaSegunSesion';
import './BuscadorInteligente.css';

const MIN_LETRAS = 2;
const ESPERA_MS = 250; // se pide a la API cuando se deja de escribir
const MAX_PRODUCTOS = 5;
const MAX_RUBROS = 3;
const MAX_COMERCIOS = 3;

const TITULOS = {
  reciente: 'Búsquedas recientes',
  producto: 'Productos',
  rubro: 'Rubros',
  comercio: 'Comercios',
};

/** Texto con la parte que coincide en negrita. */
function Resaltado({ texto, buscado }) {
  return partesResaltadas(texto, buscado).map((p, i) =>
    p.resaltado ? <strong key={i}>{p.texto}</strong> : <Fragment key={i}>{p.texto}</Fragment>
  );
}

function MiniaturaProducto({ url }) {
  const [rota, setRota] = useState(false);
  return (
    <span className="sugerencia-miniatura" aria-hidden="true">
      {url && !rota ? <img src={url} alt="" loading="lazy" onError={() => setRota(true)} /> : <Icon name="package" />}
    </span>
  );
}

/**
 * Buscador del encabezado con sugerencias mientras se escribe, al estilo de
 * los marketplaces grandes:
 *  - con el campo vacío: las búsquedas recientes (se pueden borrar de a una);
 *  - desde la 2ª letra: "Buscar …", productos (de la API, con foto y precio),
 *    rubros y comercios que coinciden (filtrados acá, sin acentos).
 *
 * Teclado: ↑ ↓ recorren las sugerencias, Enter elige, Esc cierra. Sigue el
 * patrón "combobox" de ARIA para los lectores de pantalla.
 *
 * Un producto abre su ficha acá mismo; buscar, un rubro o un comercio
 * navegan a /buscar o a la tienda.
 */
function BuscadorInteligente() {
  const location = useLocation();
  const navigate = useNavigate();
  const idLista = useId();
  const contenedor = useRef(null);
  const campo = useRef(null);

  // En /buscar el campo muestra lo que se está buscando
  const qActual = location.pathname === '/buscar' ? new URLSearchParams(location.search).get('q') || '' : '';
  const [texto, setTexto] = useState(qActual);
  useEffect(() => setTexto(qActual), [qActual]);

  const [abierto, setAbierto] = useState(false);
  const [usado, setUsado] = useState(false); // los comercios se piden recién al usar el buscador
  const [activo, setActivo] = useState(-1);
  const [recientes, setRecientes] = useState(leerRecientes);
  const [productos, setProductos] = useState({ para: '', lista: [] });
  const [ficha, setFicha] = useState(null);

  const { rubros } = useRubrosPublicos();
  const { opciones: comercios, nombreDe } = useCatalogoComercios({ activo: usado });

  const q = texto.trim();
  const buscando = q.length >= MIN_LETRAS;

  // Productos desde la API, esperando a que se deje de escribir. Si llega
  // tarde la respuesta de una búsqueda vieja, se descarta.
  useEffect(() => {
    if (!buscando) return undefined;
    let vigente = true;
    const espera = setTimeout(async () => {
      try {
        const resp = await productosService.getAll({ search: q, limit: MAX_PRODUCTOS });
        const lista = resp?.data ?? resp;
        if (vigente) setProductos({ para: q, lista: Array.isArray(lista) ? lista.slice(0, MAX_PRODUCTOS) : [] });
      } catch {
        if (vigente) setProductos({ para: q, lista: [] });
      }
    }, ESPERA_MS);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [q, buscando]);

  const cargandoProductos = buscando && productos.para !== q;

  // Lista plana de opciones: el índice es el que recorren las flechas
  const opciones = useMemo(() => {
    if (!buscando) return recientes.map((r) => ({ tipo: 'reciente', clave: `r-${r}`, texto: r }));
    return [
      { tipo: 'buscar', clave: 'buscar', texto: q },
      ...(productos.para === q ? productos.lista : []).map((p) => ({ tipo: 'producto', clave: `p-${p.id}`, producto: p })),
      ...filtrarPorNombre(rubros, q, (r) => r.nombre, MAX_RUBROS).map((r) => ({ tipo: 'rubro', clave: `ru-${r.id}`, rubro: r })),
      ...filtrarPorNombre(comercios, q, (c) => c.label, MAX_COMERCIOS).map((c) => ({
        tipo: 'comercio',
        clave: `c-${c.tipo}-${c.id}`,
        comercio: c,
      })),
    ];
  }, [buscando, q, recientes, productos, rubros, comercios]);

  // Al cambiar lo escrito no queda marcada una sugerencia vieja
  useEffect(() => setActivo(-1), [q]);

  // Se cierra al cambiar de página y al tocar fuera
  useEffect(() => setAbierto(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [abierto]);

  const cerrar = () => {
    setAbierto(false);
    setActivo(-1);
    campo.current?.blur(); // en el celular baja el teclado
  };

  const buscar = (termino) => {
    const t = termino.trim();
    if (t) setRecientes(guardarReciente(t));
    cerrar();
    navigate(t ? `/buscar?q=${encodeURIComponent(t)}` : '/buscar');
  };

  const elegir = (op) => {
    switch (op.tipo) {
      case 'reciente':
        setTexto(op.texto);
        buscar(op.texto);
        break;
      case 'buscar':
        buscar(op.texto);
        break;
      case 'producto':
        setRecientes(guardarReciente(q));
        cerrar();
        setFicha(op.producto);
        break;
      case 'rubro':
        cerrar();
        navigate(`/buscar?rubro=${op.rubro.id}`);
        break;
      case 'comercio':
        cerrar();
        navigate(`/tienda/${op.comercio.tipo}/${op.comercio.id}`);
        break;
      default:
    }
  };

  const borrarReciente = (termino) => {
    setRecientes(quitarReciente(termino));
    campo.current?.focus();
  };

  const alTeclear = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!opciones.length) return;
      e.preventDefault();
      setAbierto(true);
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      // Desde "nada marcado" (-1), ↓ va a la primera y ↑ a la última
      setActivo((i) => (i === -1 ? (paso === 1 ? 0 : opciones.length - 1) : (i + paso + opciones.length) % opciones.length));
    } else if (e.key === 'Enter' && abierto && activo >= 0 && opciones[activo]) {
      e.preventDefault();
      elegir(opciones[activo]);
    } else if (e.key === 'Escape' && abierto) {
      e.preventDefault();
      setAbierto(false);
      setActivo(-1);
    }
  };

  const mostrarLista = abierto && opciones.length > 0;
  const idOpcion = (i) => `${idLista}-op-${i}`;

  // Agrupa las opciones por tipo para los títulos, sin perder su índice
  const grupos = [];
  opciones.forEach((op, i) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.tipo === op.tipo) ultimo.items.push({ op, i });
    else grupos.push({ tipo: op.tipo, items: [{ op, i }] });
  });

  const contenidoOpcion = (op) => {
    switch (op.tipo) {
      case 'reciente':
        return (
          <>
            <span className="sugerencia-icono" aria-hidden="true"><Icon name="clock" /></span>
            <span className="sugerencia-texto">{op.texto}</span>
          </>
        );
      case 'buscar':
        return (
          <>
            <span className="sugerencia-icono" aria-hidden="true"><Icon name="search" /></span>
            <span className="sugerencia-texto">
              <span className="sugerencia-nombre">
                Buscar <strong>“{op.texto}”</strong>
              </span>
            </span>
          </>
        );
      case 'producto': {
        const p = op.producto;
        const comercio = nombreDe(p);
        return (
          <>
            <MiniaturaProducto url={p.imagen_url} />
            <span className="sugerencia-texto">
              <span className="sugerencia-nombre"><Resaltado texto={p.nombre} buscado={q} /></span>
              {comercio && <span className="sugerencia-detalle">Por {comercio}</span>}
            </span>
            <span className="sugerencia-precio">{formatearPrecio(p.precio)}</span>
          </>
        );
      }
      case 'rubro':
        return (
          <>
            <span className="sugerencia-icono" aria-hidden="true"><Icon name="folder" /></span>
            <span className="sugerencia-texto">
              <span className="sugerencia-nombre"><Resaltado texto={op.rubro.nombre} buscado={q} /></span>
              <span className="sugerencia-detalle">Ver todo el rubro</span>
            </span>
          </>
        );
      case 'comercio':
        return (
          <>
            <span className="sugerencia-icono" aria-hidden="true">
              <Icon name={op.comercio.tipo === 'mayorista' ? 'mayorista' : 'minorista'} />
            </span>
            <span className="sugerencia-texto">
              <span className="sugerencia-nombre"><Resaltado texto={op.comercio.label} buscado={q} /></span>
              <span className="sugerencia-detalle">
                {op.comercio.tipo === 'mayorista' ? 'Mayorista' : 'Minorista'} · Ver tienda
              </span>
            </span>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="buscador-inteligente" ref={contenedor}>
      <form
        className="encabezado-buscador"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          buscar(texto);
        }}
      >
        <label htmlFor="buscador-principal" className="solo-lectores">Buscar productos</label>
        <input
          ref={campo}
          id="buscador-principal"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={mostrarLista}
          aria-controls={idLista}
          aria-activedescendant={mostrarLista && activo >= 0 ? idOpcion(activo) : undefined}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => {
            setAbierto(true);
            setUsado(true);
          }}
          onKeyDown={alTeclear}
          placeholder="Buscar productos por mayor, marcas y más…"
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" aria-label="Buscar">
          <Icon name="search" />
        </button>
      </form>

      <ul id={idLista} role="listbox" aria-label="Sugerencias de búsqueda" className="sugerencias" hidden={!mostrarLista}>
        {grupos.map((g) => (
          <Fragment key={`${g.tipo}-${g.items[0].i}`}>
            {TITULOS[g.tipo] && (
              <li role="presentation" className="sugerencias-titulo">
                {TITULOS[g.tipo]}
              </li>
            )}
            {g.items.map(({ op, i }) => (
              <li
                key={op.clave}
                id={idOpcion(i)}
                role="option"
                aria-selected={i === activo}
                className={`sugerencia sugerencia-${op.tipo} ${i === activo ? 'activa' : ''}`}
                // Que el campo no pierda el foco al tocar una sugerencia
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActivo(i)}
                onClick={() => elegir(op)}
              >
                {contenidoOpcion(op)}
                {op.tipo === 'reciente' && (
                  <button
                    type="button"
                    className="sugerencia-quitar"
                    tabIndex={-1}
                    aria-label={`Borrar “${op.texto}” de las búsquedas recientes`}
                    onClick={(e) => {
                      e.stopPropagation();
                      borrarReciente(op.texto);
                    }}
                  >
                    <Icon name="close" />
                  </button>
                )}
              </li>
            ))}
            {g.tipo === 'buscar' && cargandoProductos && (
              <li role="presentation" className="sugerencias-cargando">
                <Icon name="loading" /> Buscando productos…
              </li>
            )}
          </Fragment>
        ))}
      </ul>

      {ficha && <FichaSegunSesion producto={ficha} onClose={() => setFicha(null)} />}
    </div>
  );
}

export default BuscadorInteligente;
