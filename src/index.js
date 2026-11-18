import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { migrarClavesViejas } from './utils/almacenamiento';

// Antes de dibujar nada: los datos guardados con el nombre viejo pasan al nuevo
migrarClavesViejas();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
