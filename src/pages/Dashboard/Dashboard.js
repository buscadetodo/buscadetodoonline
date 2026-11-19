import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import usersService from '../../services/usersService';
import authService from '../../services/authService';
import usuarioPerfilesService from '../../services/usuarioPerfilesService';
import Icon from '../../components/Icon/Icon';
import './Dashboard.css';

function Dashboard() {
  const [profileProgress, setProfileProgress] = useState(null);

  useEffect(() => {
    const calcularProgreso = async () => {
      try {
        const userId = authService.getCurrentUser()?.id;
        if (!userId) return;

        const raw = await usersService.getById(userId);
        // La API puede devolver el usuario directo o envuelto en { data }
        const user = raw?.data ?? raw ?? {};

        const checks = [
          Boolean(user.nombre),
          Boolean(user.apellido),
          Boolean(user.dni),
          Boolean(user.email),
          user.email_verificado === 'y',
        ];

        // ¿Tiene al menos un perfil asignado?
        try {
          const perfilesRaw = await usuarioPerfilesService.getByUser(userId);
          const perfiles = perfilesRaw?.data ?? perfilesRaw ?? [];
          checks.push(Array.isArray(perfiles) ? perfiles.length > 0 : Boolean(perfiles));
        } catch (e) {
          checks.push(false);
        }

        const completed = checks.filter(Boolean).length;
        const total = checks.length;
        const percent = Math.round((completed / total) * 100);
        setProfileProgress({ percent, completed, total });
      } catch (err) {
        console.error('Error al calcular el progreso del perfil:', err);
      }
    };

    calcularProgreso();
  }, []);

  const stats = [
    { title: 'Mayoristas', count: '0', icon: 'mayorista', color: 'var(--color-primario)', link: '/mayoristas' },
    { title: 'Minoristas', count: '0', icon: 'minorista', color: 'var(--color-primario-hover)', link: '/minoristas' },
    { title: 'Transportistas', count: '0', icon: 'transportista', color: 'var(--color-enlace)', link: '/transportistas' },
    { title: 'Compradores', count: '0', icon: 'comprador', color: 'var(--color-primario)', link: '/compradores' },
  ];

  const quickActions = [
    { title: 'Nuevo Mayorista', icon: 'add', link: '/mayoristas/nuevo', color: 'var(--color-primario)' },
    { title: 'Nuevo Minorista', icon: 'add', link: '/minoristas/nuevo', color: 'var(--color-primario-hover)' },
    { title: 'Ver Rubros', icon: 'folder', link: '/rubros', color: 'var(--color-enlace)' },
    { title: 'Banners de la home', icon: 'imagen', link: '/banners', color: 'var(--color-primario-hover)' },
    { title: 'Gestionar Usuarios', icon: 'users', link: '/usuarios', color: 'var(--color-primario)' },
  ];

  return (
    <div className="dashboard">
      {/* Hero de bienvenida */}
      <div className="dashboard-hero">
        <div className="hero-text">
          <span className="hero-badge"><Icon name="rocket" /> ¡Empecemos!</span>
          <h1>Bienvenido a Buscádetodo</h1>
          <p>
            La plataforma donde compradores y vendedores se encuentran.
            Completá tu perfil para comenzar a publicar productos, realizar
            compras y aprovechar todas las herramientas disponibles.
          </p>
          <Link to="/perfil" className="hero-btn">Completar perfil</Link>
        </div>
        <div className="hero-profile">
          <h3>Progreso del perfil</h3>
          <div className="hero-progress">
            <div
              className="hero-progress-bar"
              style={{ width: `${profileProgress?.percent ?? 0}%` }}
            />
          </div>
          <b>
            {profileProgress
              ? `${profileProgress.percent}% completado`
              : 'Calculando…'}
          </b>
          <p>
            {profileProgress && profileProgress.percent >= 100
              ? '¡Tu perfil está completo! Ya podés usar todas las funciones.'
              : 'Solo faltan algunos datos para habilitar todas las funciones.'}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <Link to={stat.link} key={index} className="stat-card" style={{ '--color': stat.color }}>
            <div className="stat-icon"><Icon name={stat.icon} /></div>
            <div className="stat-content">
              <h3 className="stat-title">{stat.title}</h3>
              <p className="stat-count">{stat.count}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="dashboard-section">
        <h2>Acciones Rápidas</h2>
        <div className="actions-grid">
          {quickActions.map((action, index) => (
            <Link to={action.link} key={index} className="action-card" style={{ '--color': action.color }}>
              <span className="action-icon"><Icon name={action.icon} /></span>
              <span className="action-title">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Actividad Reciente</h2>
        <div className="activity-card">
          <p className="empty-state">No hay actividad reciente</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
