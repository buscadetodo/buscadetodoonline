import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usersService from '../../services/usersService';
import authService from '../../services/authService';
import { usePerfilActivo } from '../../context/PerfilContext';
import MisPerfiles from '../../components/MisPerfiles/MisPerfiles';
import Icon from '../../components/Icon/Icon';
import { esEmailValido } from '../../utils/validaciones';
import './Perfil.css';

function Perfil() {
  const navigate = useNavigate();
  // /dashboard es adminOnly: para un usuario comun hay que volver a su propio panel
  const { panelUrl } = usePerfilActivo();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    apellido: '',
    dni: '',
    id_rol: '',
    email_verificado: '',
    estado_cuenta: '',
    password: '', // Opcional
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // El id del usuario sale del token (campo `sub`). Antes había un plan B
      // que buscaba al usuario en GET /users/, pero con R-003 ese listado es
      // solo para administradores (403 para el resto) y el token siempre trae
      // el id, así que se quitó.
      const storedUserId = authService.getCurrentUser()?.id;
      
      if (!storedUserId) {
        setError('No se pudo identificar tu usuario. Por favor, cierra sesión e inicia sesión nuevamente.');
        return;
      }

      setUserId(storedUserId);

      // Obtener datos del usuario
      const response = await usersService.getById(storedUserId);
      const userData = response.data;

      setFormData({
        email: userData.email || '',
        nombre: userData.nombre || '',
        apellido: userData.apellido || '',
        dni: userData.dni || '',
        id_rol: userData.id_rol || '',
        email_verificado: userData.email_verificado || 'n',
        estado_cuenta: userData.estado_cuenta || 'y',
        password: '', // No cargar contraseña
      });

    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.detail || 
                         'Error al cargar el perfil';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!esEmailValido(formData.email)) {
      setError('Ingresá un email válido (ej.: nombre@empresa.com)');
      return;
    }

    try {
      setSaving(true);

      // Preparar datos para actualizar
      const updateData = {
        email: formData.email,
        nombre: formData.nombre,
        apellido: formData.apellido,
        dni: formData.dni,
        id_rol: formData.id_rol,
        email_verificado: formData.email_verificado,
        estado_cuenta: formData.estado_cuenta,
      };

      // Solo incluir password si se ingresó uno nuevo
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password;
      }

      await usersService.update(userId, updateData);
      
      setSuccess(true);
      
      // Limpiar el campo de contraseña después de guardar
      setFormData({
        ...formData,
        password: ''
      });

      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.detail || 
                         'Error al actualizar el perfil';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="perfil-page">
        <div className="loading"><Icon name="loading" /> Cargando perfil...</div>
      </div>
    );
  }

  return (
    <div className="perfil-page">
      <div className="perfil-header">
        <h1><Icon name="settings" /> Mi Perfil</h1>
        <p className="page-subtitle">Administra tu información personal</p>
      </div>

      <div className="perfil-container">
        {error && (
          <div className="alert alert-error">
            <span><Icon name="warning" /></span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span><Icon name="success" /></span>
            <span>Perfil actualizado correctamente</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="perfil-form">
          <div className="form-section">
            <h3>Información Personal</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Tu nombre"
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellido">Apellido *</label>
                <input
                  id="apellido"
                  name="apellido"
                  type="text"
                  value={formData.apellido}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="dni">DNI *</label>
              <input
                id="dni"
                name="dni"
                type="text"
                value={formData.dni}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="12345678"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Cambiar Contraseña</h3>
            <p className="form-hint">Deja en blanco si no deseas cambiar tu contraseña</p>
            
            <div className="form-group">
              <label htmlFor="password">Nueva Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
                minLength={6}
              />
              <small className="form-help">Mínimo 6 caracteres</small>
            </div>
          </div>

          <div className="form-section">
            <h3>Estado de Cuenta</h3>
            
            <div className="info-grid">
              <div className="info-card">
                <span className="info-label">Email Verificado</span>
                <span className={`status-badge ${formData.email_verificado === 'y' ? 'status-active' : 'status-inactive'}`}>
                  {formData.email_verificado === 'y' ? <><Icon name="success" /> Verificado</> : <><Icon name="error" /> No Verificado</>}
                </span>
              </div>

              <div className="info-card">
                <span className="info-label">Estado de Cuenta</span>
                <span className={`status-badge ${formData.estado_cuenta === 'y' ? 'status-active' : 'status-inactive'}`}>
                  {formData.estado_cuenta === 'y' ? <><Icon name="success" /> Activa</> : <><Icon name="error" /> Inactiva</>}
                </span>
              </div>

              <div className="info-card">
                <span className="info-label">ID de Usuario</span>
                <span className="info-value">#{userId}</span>
              </div>

              <div className="info-card">
                <span className="info-label">Rol</span>
                <span className="info-value">ID: {formData.id_rol}</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              // Si panelUrl es /perfil ya estamos aca: Cancelar no puede quedar mudo
              onClick={() => navigate(panelUrl === '/perfil' ? '/' : panelUrl)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? <><Icon name="loading" /> Guardando...</> : <><Icon name="save" /> Guardar Cambios</>}
            </button>
          </div>
        </form>

        {/* Fuera del form: son acciones propias, no parte del alta de datos */}
        <MisPerfiles />
      </div>
    </div>
  );
}

export default Perfil;
