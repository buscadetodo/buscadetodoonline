import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { migrarClavesViejas } from './utils/almacenamiento';
import { registrarServiceWorker } from './registrarServiceWorker';
import './utils/instalacion'; // escucha desde el arranque si el navegador ofrece instalar

// Antes de dibujar nada: los datos guardados con el nombre viejo pasan al nuevo
migrarClavesViejas();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Instalar como app y abrir sin conexión (solo en producción)
registrarServiceWorker();
