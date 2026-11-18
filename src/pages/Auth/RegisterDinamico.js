import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import SelectRubro from '../../components/SelectRubro/SelectRubro';
import {
  CUIT_AYUDA,
  esCuitValido,
  esEmailValido,
  esPatenteValida,
  normalizarCuit,
  normalizarPatente,
  PATENTE_AYUDA,
  tieneCaracteresHtml,
  TEXTO_SIN_HTML_AYUDA,
} from '../../utils/validaciones';
import authService from '../../services/authService';
import usuarioPerfilesService from '../../services/usuarioPerfilesService';
import mayoristasService from '../../services/mayoristasService';
import minoristasService from '../../services/minoristasService';
import compradoresService from '../../services/compradoresService';
import transportistasService from '../../services/transportistasService';
import diasService from '../../services/diasService';
import horariosService from '../../services/horariosService';
import { PERFIL } from '../../config/roles';
import './RegisterMejorado.css';

/**
 * Extrae un mensaje legible de un error de la API.
 * FastAPI devuelve `detail` (string o array de validación), no `message`.
 */
const mensajeDeError = (error, fallback) => {
  const data = error.response?.data;
  if (!data) return error.message || fallback;

  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const primero = data.detail[0];
    const campo = Array.isArray(primero.loc) ? primero.loc[primero.loc.length - 1] : null;
    const msg = primero.msg?.replace(/^Value error,\s*/, '') || 'dato inválido';
    return campo ? `${campo}: ${msg}` : msg;
  }

  return data.error || data.detail || data.message || fallback;
};

function RegisterMejorado() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [datosComunes, setDatosComunes] = useState({
    email: '',
    password: '',
    confirmarPassword: '',
    nombre: '',
    apellido: '',
    dni: ''
  });

  const [datosEspecificos, setDatosEspecificos] = useState({
    razon_social: '',
    cuit: '',
    rubro_id: '',
    // Nota: hora_desde_id / hora_hasta_id / atencion_dia_* también son
    // obligatorios para el comercio, pero no se piden acá porque sus catálogos
    // requieren token. Se resuelven después del login en
    // resolverHorarioPorDefecto().
    pedido_minimo: '',
    retiro_en_local: 'n',
    descripcion: '',
    tipo_vehiculo: '',
    patente: '',
    capacidad_carga: '',
    refrigerado: 'n',
    precio_base: '',
    precio_por_km: ''
  });


  const getConfig = () => {
    // Los perfil_id salen de config/roles (1=mayorista, 2=minorista,
    // 3=transportista, 4=comprador). Estaban hardcodeados y comprador y
    // transportista venían cruzados (3 y 4 al revés), así que quien se
    // registraba como comprador quedaba con el perfil de transportista.
    const configs = {
      mayorista: {
        titulo: 'Registro de Mayorista',
        icono: 'mayorista',
        color: 'var(--color-perfil-mayorista)',
        colorDark: 'var(--color-perfil-mayorista-oscuro)',
        perfil_id: PERFIL.MAYORISTA,
        totalSteps: 2
      },
      minorista: {
        titulo: 'Registro de Minorista',
        icono: 'minorista',
        color: 'var(--color-perfil-minorista)',
        colorDark: 'var(--color-perfil-minorista-oscuro)',
        perfil_id: PERFIL.MINORISTA,
        totalSteps: 2
      },
      comprador: {
        titulo: 'Registro de Comprador',
        icono: 'comprador',
        color: 'var(--color-perfil-comprador)',
        colorDark: 'var(--color-perfil-comprador-oscuro)',
        perfil_id: PERFIL.COMPRADOR,
        totalSteps: 1
      },
      transportista: {
        titulo: 'Registro de Transportista',
        icono: 'transportista',
        color: 'var(--color-perfil-transportista)',
        colorDark: 'var(--color-perfil-transportista-oscuro)',
        perfil_id: PERFIL.TRANSPORTISTA,
        totalSteps: 2
      }
    };
    return configs[tipo] || configs.comprador;
  };

  const config = getConfig();

  // Validaciones
  const validateStep1 = () => {
    const newErrors = {};

    if (!datosComunes.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    else if (tieneCaracteresHtml(datosComunes.nombre)) newErrors.nombre = `El nombre ${TEXTO_SIN_HTML_AYUDA}`;
    if (!datosComunes.apellido.trim()) newErrors.apellido = 'El apellido es requerido';
    else if (tieneCaracteresHtml(datosComunes.apellido)) newErrors.apellido = `El apellido ${TEXTO_SIN_HTML_AYUDA}`;
    if (!datosComunes.dni.trim()) newErrors.dni = 'El DNI es requerido';
    if (datosComunes.dni.length < 7) newErrors.dni = 'DNI inválido';
    
    if (!datosComunes.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!esEmailValido(datosComunes.email)) {
      newErrors.email = 'Ingresá un email válido (ej.: nombre@empresa.com)';
    }

    if (!datosComunes.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (datosComunes.password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }

    if (datosComunes.password !== datosComunes.confirmarPassword) {
      newErrors.confirmarPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (tipo === 'mayorista' || tipo === 'minorista') {
      if (!datosEspecificos.razon_social.trim()) {
        newErrors.razon_social = 'La razón social es requerida';
      } else if (tieneCaracteresHtml(datosEspecificos.razon_social)) {
        newErrors.razon_social = `La razón social ${TEXTO_SIN_HTML_AYUDA}`;
      }
      if (!datosEspecificos.cuit.trim()) {
        newErrors.cuit = 'El CUIT es requerido';
      } else if (!esCuitValido(datosEspecificos.cuit)) {
        newErrors.cuit = `CUIT inválido (${CUIT_AYUDA})`;
      }
      // La API rechaza la ficha de comercio sin un rubro válido.
      if (!datosEspecificos.rubro_id) {
        newErrors.rubro_id = 'Elegí el rubro de tu comercio';
      }
    }

    // Texto libre de cualquier tipo de cuenta (el backend rechaza < y >).
    if (tieneCaracteresHtml(datosEspecificos.descripcion)) {
      newErrors.descripcion = `La descripción ${TEXTO_SIN_HTML_AYUDA}`;
    }
    if (tieneCaracteresHtml(datosEspecificos.capacidad_carga)) {
      newErrors.capacidad_carga = `La capacidad de carga ${TEXTO_SIN_HTML_AYUDA}`;
    }

    if (tipo === 'transportista') {
      if (!datosEspecificos.tipo_vehiculo) {
        newErrors.tipo_vehiculo = 'Selecciona el tipo de vehículo';
      }
      if (!datosEspecificos.patente.trim()) {
        newErrors.patente = 'La patente es requerida';
      } else if (!esPatenteValida(datosEspecificos.patente)) {
        newErrors.patente = `Patente inválida (${PATENTE_AYUDA})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentStep === 1 && config.totalSteps > 1) {
      handleNext();
      return;
    }

    if (currentStep === 2 && !validateStep2()) {
      return;
    }

    if (currentStep === 1 && !validateStep1()) {
      return;
    }

    setLoading(true);

    try {
      // Crear usuario
      const usuarioPayload = {
        email: datosComunes.email,
        password: datosComunes.password,
        nombre: datosComunes.nombre,
        apellido: datosComunes.apellido,
        dni: datosComunes.dni,
        id_rol: 2,
        email_verificado: 'n',
        estado_cuenta: 'y'
      };

      const responseUser = await authService.register(usuarioPayload);
      const nuevoUsuarioId = responseUser.id || responseUser.data?.id;

      if (!nuevoUsuarioId) {
        throw new Error('No se pudo obtener el ID del usuario creado');
      }

      toast.success('Usuario creado');

      // Login automático
      await authService.login(datosComunes.email, datosComunes.password);
      toast.success('Autenticación exitosa');

      // Asignar perfil
      await usuarioPerfilesService.assign(nuevoUsuarioId, config.perfil_id);
      toast.success('Perfil asignado');

      // Crear el registro específico (ficha comercial / transportista / comprador).
      // Si esto falla, la cuenta queda creada y usable pero SIN la ficha, y hay
      // que decirlo: quedarse en el genérico dejaba al usuario creyendo que su
      // comercio existía cuando no se había creado nada.
      try {
        await crearRegistroEspecifico(nuevoUsuarioId);
      } catch (errorRegistro) {
        console.error('Error al crear el registro específico:', errorRegistro);
        const detalle = mensajeDeError(errorRegistro, 'la API rechazó los datos');
        toast.error(
          `Tu cuenta se creó, pero no se pudo registrar tu ${tipo}: ${detalle}. Completalo desde "Agregar perfil".`
        );
        setTimeout(() => navigate('/agregar-perfil', { replace: true }), 2500);
        return;
      }

      toast.success(`¡Cuenta de ${tipo} creada exitosamente!`);

      // Redirigir
      setTimeout(() => {
        const dashboardRoutes = {
          mayorista: '/mayorista/dashboard',
          minorista: '/minorista/dashboard',
          comprador: '/comprador/home',
          transportista: '/transportista/dashboard'
        };
        navigate(dashboardRoutes[tipo] || '/dashboard', { replace: true });
      }, 1500);

    } catch (error) {
      console.error('Error en registro:', error);
      toast.error(mensajeDeError(error, 'Error al crear la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resuelve los IDs de horario y día que la API exige para el comercio.
   *
   * No se piden en el formulario: durante el registro el usuario todavía no
   * tiene token, y `/horarios/` y `/dias/` requieren autenticación. Como esta
   * función corre después del login automático, acá sí se pueden consultar.
   *
   * Se usa Lunes a Viernes de 08:00 a 18:00 como horario inicial; el usuario
   * lo ajusta después desde su panel.
   */
  const resolverHorarioPorDefecto = async () => {
    // Fallback: seed documentado (horarios 1–24 = 00:00–23:00, días 1=Lunes).
    const porDefecto = {
      hora_desde_id: 9,
      hora_hasta_id: 19,
      atencion_dia_desde_id: 1,
      atencion_dia_hasta_id: 5,
    };

    try {
      const [diasResp, horariosResp] = await Promise.all([
        diasService.getAll(),
        horariosService.getAll(50, 0),
      ]);

      const listaDias = diasResp?.data ?? diasResp ?? [];
      const listaHorarios = horariosResp?.data ?? horariosResp ?? [];

      // Se busca por valor para no depender del orden del seed.
      const buscarHora = (hhmm, fallback) =>
        (Array.isArray(listaHorarios) ? listaHorarios : []).find((h) =>
          String(h.hora).startsWith(hhmm)
        )?.id ?? fallback;
      const buscarDia = (nombre, fallback) =>
        (Array.isArray(listaDias) ? listaDias : []).find(
          (d) => String(d.dia).toLowerCase() === nombre
        )?.id ?? fallback;

      return {
        hora_desde_id: buscarHora('08', porDefecto.hora_desde_id),
        hora_hasta_id: buscarHora('18', porDefecto.hora_hasta_id),
        atencion_dia_desde_id: buscarDia('lunes', porDefecto.atencion_dia_desde_id),
        atencion_dia_hasta_id: buscarDia('viernes', porDefecto.atencion_dia_hasta_id),
      };
    } catch (err) {
      console.error('No se pudieron leer días/horarios, se usa el default:', err);
      return porDefecto;
    }
  };

  const crearRegistroEspecifico = async (idUsuario) => {
    // Se arma el body campo por campo. Antes se hacía spread de
    // `datosEspecificos`, así que a /mayoristas/ le llegaban también los
    // campos de transportista (patente, tipo_vehiculo…) y viceversa.
    switch (tipo) {
      case 'mayorista':
      case 'minorista': {
        const horario = await resolverHorarioPorDefecto();

        const comercio = {
          id_usuario: Number(idUsuario),
          razon_social: datosEspecificos.razon_social.trim(),
          cuit: datosEspecificos.cuit.trim(),
          rubro_id: Number(datosEspecificos.rubro_id) || null,
          ...horario,
          pedido_minimo: parseFloat(datosEspecificos.pedido_minimo) || 0,
          retiro_en_local: datosEspecificos.retiro_en_local,
          descripcion: datosEspecificos.descripcion.trim() || null,
        };

        if (tipo === 'mayorista') {
          await mayoristasService.create(comercio);
        } else {
          await minoristasService.create(comercio);
        }
        break;
      }
      case 'comprador':
        await compradoresService.create({
          id_usuario: Number(idUsuario),
          nombre: datosComunes.nombre,
          apellido: datosComunes.apellido
        });
        break;
      case 'transportista':
        await transportistasService.create({
          id_usuario: Number(idUsuario),
          tipo_vehiculo: datosEspecificos.tipo_vehiculo,
          patente: datosEspecificos.patente.trim(),
          capacidad_carga: datosEspecificos.capacidad_carga.trim(),
          refrigerado: datosEspecificos.refrigerado,
          precio_base: parseFloat(datosEspecificos.precio_base) || 0,
          precio_por_km: parseFloat(datosEspecificos.precio_por_km) || 0,
          descripcion: datosEspecificos.descripcion.trim() || null,
        });
        break;
      default:
        break;
    }
  };

  const getPasswordStrength = () => {
    const password = datosComunes.password;
    if (!password) return { strength: '', text: '' };
    
    if (password.length < 6) return { strength: 'weak', text: 'Débil' };
    if (password.length < 10) return { strength: 'medium', text: 'Media' };
    return { strength: 'strong', text: 'Fuerte' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="register-mejorado-container">
      <div 
        className="register-mejorado-card"
        style={{ 
          '--color': config.color,
          '--color-dark': config.colorDark
        }}
      >
        {/* Header */}
        <div className="register-header">
          <span className="register-header-icon"><Icon name={config.icono} /></span>
          <h1>{config.titulo}</h1>
          <p>Completá tus datos para empezar</p>
        </div>

        {/* Stepper */}
        {config.totalSteps > 1 && (
          <div className="stepper">
            <div className={`step ${currentStep >= 1 ? 'completed' : ''} ${currentStep === 1 ? 'active' : ''}`}>
              <div className="step-number">
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className="step-label">Datos Personales</span>
            </div>
            <div className={`step ${currentStep >= 2 ? 'completed' : ''} ${currentStep === 2 ? 'active' : ''}`}>
              <div className="step-number">
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className="step-label">Información de {tipo}</span>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="register-content">
            {/* PASO 1: Datos Personales */}
            <div className={`form-step ${currentStep === 1 ? 'active' : ''}`}>
              <h2 className="form-step-title">Tus datos personales</h2>

              <div className="form-row-mejorado">
                <div className={`form-group-mejorado ${errors.nombre ? 'error' : ''}`}>
                  <label>Nombre *</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      className="has-icon"
                      value={datosComunes.nombre}
                      onChange={(e) => {
                        setDatosComunes({...datosComunes, nombre: e.target.value});
                        setErrors({...errors, nombre: ''});
                      }}
                      placeholder="Ej.: Juan"
                    />
                    <span className="input-icon"><Icon name="user" /></span>
                  </div>
                  {errors.nombre && <span className="error-message"><Icon name="warning" /> {errors.nombre}</span>}
                </div>

                <div className={`form-group-mejorado ${errors.apellido ? 'error' : ''}`}>
                  <label>Apellido *</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      className="has-icon"
                      value={datosComunes.apellido}
                      onChange={(e) => {
                        setDatosComunes({...datosComunes, apellido: e.target.value});
                        setErrors({...errors, apellido: ''});
                      }}
                      placeholder="Ej.: Pérez"
                    />
                    <span className="input-icon"><Icon name="user" /></span>
                  </div>
                  {errors.apellido && <span className="error-message"><Icon name="warning" /> {errors.apellido}</span>}
                </div>
              </div>

              <div className={`form-group-mejorado ${errors.dni ? 'error' : ''}`}>
                <label>DNI *</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    className="has-icon"
                    value={datosComunes.dni}
                    onChange={(e) => {
                      setDatosComunes({...datosComunes, dni: e.target.value.replace(/\D/g, '')});
                      setErrors({...errors, dni: ''});
                    }}
                    placeholder="Sin puntos, ej.: 30111222"
                    maxLength="8"
                  />
                  <span className="input-icon">🆔</span>
                </div>
                {errors.dni && <span className="error-message"><Icon name="warning" /> {errors.dni}</span>}
              </div>

              <div className={`form-group-mejorado ${errors.email ? 'error' : ''}`}>
                <label>Email *</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    className="has-icon"
                    value={datosComunes.email}
                    onChange={(e) => {
                      setDatosComunes({...datosComunes, email: e.target.value});
                      setErrors({...errors, email: ''});
                    }}
                    placeholder="tu@email.com"
                  />
                  <span className="input-icon"><Icon name="mail" /></span>
                </div>
                {errors.email && <span className="error-message"><Icon name="warning" /> {errors.email}</span>}
              </div>

              <div className="form-row-mejorado">
                <div className={`form-group-mejorado ${errors.password ? 'error' : ''}`}>
                  <label>Contraseña *</label>
                  <div className="input-wrapper password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="has-icon has-toggle"
                      value={datosComunes.password}
                      onChange={(e) => {
                        setDatosComunes({...datosComunes, password: e.target.value});
                        setErrors({...errors, password: ''});
                      }}
                      placeholder="6+ caracteres"
                    />
                    <span className="input-icon"><Icon name="lock" /></span>
                    <button
                      type="button"
                      className={`password-toggle ${showPassword ? 'visible' : ''}`}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <span className="eye-icon"><Icon name="view" /></span>
                    </button>
                  </div>
                  {errors.password && <span className="error-message"><Icon name="warning" /> {errors.password}</span>}
                  {datosComunes.password && (
                    <div className="password-strength">
                      <div className="strength-bar">
                        <div className={`strength-fill ${passwordStrength.strength}`}></div>
                      </div>
                      <span className="strength-text">
                        Seguridad: {passwordStrength.text}
                      </span>
                    </div>
                  )}
                </div>

                <div className={`form-group-mejorado ${errors.confirmarPassword ? 'error' : ''}`}>
                  <label>Confirmar Contraseña *</label>
                  <div className="input-wrapper password-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="has-icon has-toggle"
                      value={datosComunes.confirmarPassword}
                      onChange={(e) => {
                        setDatosComunes({...datosComunes, confirmarPassword: e.target.value});
                        setErrors({...errors, confirmarPassword: ''});
                      }}
                      placeholder="Repetila"
                    />
                    <span className="input-icon"><Icon name="lock" /></span>
                    <button
                      type="button"
                      className={`password-toggle ${showConfirmPassword ? 'visible' : ''}`}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <span className="eye-icon"><Icon name="view" /></span>
                    </button>
                    {datosComunes.confirmarPassword && datosComunes.password === datosComunes.confirmarPassword && (
                      <span className="success-checkmark">✓</span>
                    )}
                  </div>
                  {errors.confirmarPassword && <span className="error-message"><Icon name="warning" /> {errors.confirmarPassword}</span>}
                </div>
              </div>

              {config.totalSteps === 1 && (
                <div className="step-navigation">
                  <button
                    type="button"
                    className="btn-nav btn-back"
                    onClick={() => navigate('/registro')}
                  >
                    ← Volver
                  </button>
                  <button type="submit" className="btn-nav btn-submit" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="loading-spinner"></span> Creando cuenta...
                      </>
                    ) : (
                      <>Crear cuenta →</>
                    )}
                  </button>
                </div>
              )}

              {config.totalSteps > 1 && (
                <div className="step-navigation">
                  <button
                    type="button"
                    className="btn-nav btn-back"
                    onClick={() => navigate('/registro')}
                  >
                    ← Volver
                  </button>
                  <button type="button" className="btn-nav btn-next" onClick={handleNext}>
                    Siguiente →
                  </button>
                </div>
              )}
            </div>

            {/* PASO 2: Datos Específicos */}
            {config.totalSteps > 1 && (
              <div className={`form-step ${currentStep === 2 ? 'active' : ''}`}>
                <h2 className="form-step-title">Información de tu {tipo}</h2>

                {(tipo === 'mayorista' || tipo === 'minorista') && (
                  <>
                    <div className={`form-group-mejorado ${errors.razon_social ? 'error' : ''}`}>
                      <label>Razón Social *</label>
                      <input
                        type="text"
                        value={datosEspecificos.razon_social}
                        onChange={(e) => {
                          setDatosEspecificos({...datosEspecificos, razon_social: e.target.value});
                          setErrors({...errors, razon_social: ''});
                        }}
                        placeholder="Ej.: Distribuidora del Sur S.A."
                      />
                      {errors.razon_social && <span className="error-message"><Icon name="warning" /> {errors.razon_social}</span>}
                    </div>

                    <div className={`form-group-mejorado ${errors.cuit ? 'error' : ''}`}>
                      <label>CUIT *</label>
                      <input
                        type="text"
                        value={datosEspecificos.cuit}
                        onChange={(e) => {
                          setDatosEspecificos({...datosEspecificos, cuit: normalizarCuit(e.target.value)});
                          setErrors({...errors, cuit: ''});
                        }}
                        placeholder="Ej.: 20123456789"
                        inputMode="numeric"
                        maxLength={11}
                      />
                      {!errors.cuit && <small className="form-hint">{CUIT_AYUDA}</small>}
                      {errors.cuit && <span className="error-message"><Icon name="warning" /> {errors.cuit}</span>}
                    </div>

                    {/* GET /rubros/ es público desde R-003 (devolución v1): la lista
                        sale de la API. Antes estaban fijos los IDs 1 a 4 porque el
                        endpoint pedía token y en el registro todavía no hay sesión. */}
                    <div className={`form-group-mejorado ${errors.rubro_id ? 'error' : ''}`}>
                      <label htmlFor="reg-rubro">Rubro *</label>
                      <SelectRubro
                        id="reg-rubro"
                        value={datosEspecificos.rubro_id}
                        onChange={(e) => {
                          setDatosEspecificos({...datosEspecificos, rubro_id: e.target.value});
                          setErrors({...errors, rubro_id: ''});
                        }}
                      />
                      {errors.rubro_id && <span className="error-message"><Icon name="warning" /> {errors.rubro_id}</span>}
                    </div>

                    <div className="form-group-mejorado">
                      <label>Pedido Mínimo</label>
                      <div className="campo-moneda">
                        <span className="campo-moneda-signo" aria-hidden="true">$</span>
                        <input
                          type="number"
                          value={datosEspecificos.pedido_minimo}
                          onChange={(e) => setDatosEspecificos({...datosEspecificos, pedido_minimo: e.target.value})}
                          placeholder="Ej.: 10000"
                        />
                      </div>
                    </div>

                    <div className="checkbox-mejorado">
                      <input
                        type="checkbox"
                        id="retiro"
                        checked={datosEspecificos.retiro_en_local === 'y'}
                        onChange={(e) => setDatosEspecificos({...datosEspecificos, retiro_en_local: e.target.checked ? 'y' : 'n'})}
                      />
                      <label htmlFor="retiro">
                        <Icon name="local" /> Permitir retiro en local
                      </label>
                    </div>

                    <div className={`form-group-mejorado ${errors.descripcion ? 'error' : ''}`}>
                      <label>Descripción</label>
                      <textarea
                        value={datosEspecificos.descripcion}
                        onChange={(e) => setDatosEspecificos({...datosEspecificos, descripcion: e.target.value})}
                        placeholder="Contanos sobre tu negocio..."
                        rows="4"
                      />
                      {errors.descripcion && <span className="error-message"><Icon name="warning" /> {errors.descripcion}</span>}
                    </div>
                  </>
                )}

                {tipo === 'transportista' && (
                  <>
                    <div className={`form-group-mejorado ${errors.tipo_vehiculo ? 'error' : ''}`}>
                      <label>Tipo de Vehículo *</label>
                      <select
                        value={datosEspecificos.tipo_vehiculo}
                        onChange={(e) => {
                          setDatosEspecificos({...datosEspecificos, tipo_vehiculo: e.target.value});
                          setErrors({...errors, tipo_vehiculo: ''});
                        }}
                      >
                        {/* Mismos valores que TransportistaForm y AgregarPerfil */}
                        <option value="">Seleccionar...</option>
                        <option value="Camioneta">Camioneta</option>
                        <option value="Camión">Camión</option>
                        <option value="Furgón">Furgón</option>
                        <option value="Semi">Semi</option>
                      </select>
                      {errors.tipo_vehiculo && <span className="error-message"><Icon name="warning" /> {errors.tipo_vehiculo}</span>}
                    </div>

                    <div className={`form-group-mejorado ${errors.patente ? 'error' : ''}`}>
                      <label htmlFor="reg-patente">Patente *</label>
                      <input
                        id="reg-patente"
                        type="text"
                        value={datosEspecificos.patente}
                        onChange={(e) => {
                          setDatosEspecificos({...datosEspecificos, patente: normalizarPatente(e.target.value)});
                          setErrors({...errors, patente: ''});
                        }}
                        placeholder="Ej.: ABC123"
                        maxLength="7"
                      />
                      {errors.patente && <span className="error-message"><Icon name="warning" /> {errors.patente}</span>}
                    </div>

                    <div className={`form-group-mejorado ${errors.capacidad_carga ? 'error' : ''}`}>
                      <label>Capacidad de Carga</label>
                      <input
                        type="text"
                        value={datosEspecificos.capacidad_carga}
                        onChange={(e) => setDatosEspecificos({...datosEspecificos, capacidad_carga: e.target.value})}
                        placeholder="Ej: 5000 kg"
                      />
                      {errors.capacidad_carga && <span className="error-message"><Icon name="warning" /> {errors.capacidad_carga}</span>}
                    </div>

                    <div className="checkbox-mejorado">
                      <input
                        type="checkbox"
                        id="refrigerado"
                        checked={datosEspecificos.refrigerado === 'y'}
                        onChange={(e) => setDatosEspecificos({...datosEspecificos, refrigerado: e.target.checked ? 'y' : 'n'})}
                      />
                      <label htmlFor="refrigerado">
                        <Icon name="cold" /> Vehículo refrigerado
                      </label>
                    </div>

                    <div className="form-row-mejorado">
                      <div className="form-group-mejorado">
                        <label>Precio Base</label>
                        <div className="campo-moneda">
                          <span className="campo-moneda-signo" aria-hidden="true">$</span>
                          <input
                            type="number"
                            value={datosEspecificos.precio_base}
                            onChange={(e) => setDatosEspecificos({...datosEspecificos, precio_base: e.target.value})}
                            placeholder="Ej.: 500"
                          />
                        </div>
                      </div>

                      <div className="form-group-mejorado">
                        <label>Precio por Km</label>
                        <div className="campo-moneda">
                          <span className="campo-moneda-signo" aria-hidden="true">$</span>
                          <input
                            type="number"
                            value={datosEspecificos.precio_por_km}
                            onChange={(e) => setDatosEspecificos({...datosEspecificos, precio_por_km: e.target.value})}
                            placeholder="Ej.: 15"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={`form-group-mejorado ${errors.descripcion ? 'error' : ''}`}>
                      <label>Descripción</label>
                      <textarea
                        value={datosEspecificos.descripcion}
                        onChange={(e) => setDatosEspecificos({...datosEspecificos, descripcion: e.target.value})}
                        placeholder="Contanos sobre tu servicio de transporte..."
                        rows="4"
                      />
                      {errors.descripcion && <span className="error-message"><Icon name="warning" /> {errors.descripcion}</span>}
                    </div>
                  </>
                )}

                <div className="step-navigation">
                  <button type="button" className="btn-nav btn-back" onClick={handleBack}>
                    ← Anterior
                  </button>
                  <button type="submit" className="btn-nav btn-submit" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="loading-spinner"></span> Creando cuenta...
                      </>
                    ) : (
                      <>Crear cuenta →</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="register-footer">
          <p>
            ¿Ya tenés cuenta?{' '}
            <Link to="/login">Iniciá sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterMejorado;
