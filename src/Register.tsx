import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import './Register.css'; // Importar el CSS personalizado

interface FormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  dni: string;
  telefono: string;
  direccion: string;
  fecha_nacimiento: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  [key: string]: string;
}

interface ApiErrorResponse {
  username?: string[];
  email?: string[];
  dni?: string[];
  first_name?: string[];
  last_name?: string[];
  telefono?: string[];
  direccion?: string[];
  fecha_nacimiento?: string[];
  password?: string[];
  non_field_errors?: string[];
}

interface RegisterProps {
  onGoToLogin?: () => void;
}

const Register: React.FC<RegisterProps> = ({ onGoToLogin }) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    dni: '',
    telefono: '',
    direccion: '',
    fecha_nacimiento: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Configuración de la API - ajusta según tu configuración
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://tu-dominio.com/api' 
    : 'http://localhost:8000/api';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error específico cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    // Validaciones básicas
    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido';
    }

    if (!formData.dni.trim()) {
      newErrors.dni = 'El DNI es requerido';
    } else if (!/^\d{8,10}$/.test(formData.dni)) {
      newErrors.dni = 'El DNI debe tener entre 8 y 10 dígitos';
    }

    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento es requerida';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return newErrors;
  };

  const handleSubmit = async (): Promise<void> => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Preparar datos para enviar (excluir confirmPassword)
      const { confirmPassword, ...dataToSend } = formData;
      
      const response = await fetch(`${API_BASE_URL}/usuarios/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      const data: ApiErrorResponse = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({
          username: '',
          email: '',
          first_name: '',
          last_name: '',
          dni: '',
          telefono: '',
          direccion: '',
          fecha_nacimiento: '',
          password: '',
          confirmPassword: ''
        });
      } else {
        // Manejar errores del servidor
        const newErrors: FormErrors = {};
        
        // Mapear errores específicos de campo
        Object.keys(data).forEach(field => {
          if (field !== 'non_field_errors' && data[field as keyof ApiErrorResponse]) {
            const errorArray = data[field as keyof ApiErrorResponse];
            if (Array.isArray(errorArray) && errorArray.length > 0) {
              newErrors[field] = errorArray[0];
            }
          }
        });

        // Errores generales
        if (data.non_field_errors && data.non_field_errors.length > 0) {
          newErrors.general = data.non_field_errors[0];
        }

        // Si no hay errores específicos pero la respuesta falló
        if (Object.keys(newErrors).length === 0) {
          newErrors.general = `Error del servidor (${response.status}). Por favor, inténtalo de nuevo.`;
        }

        setErrors(newErrors);
      }
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      setErrors({ 
        general: 'Error de conexión. Verifica que el servidor esté funcionando y que la URL sea correcta.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword'): void => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  if (success) {
    return (
      <div className="register-container">
        <div className="register-card">
          <div className="success-section">
            <div className="success-icon">
              <CheckCircle />
            </div>
            <h2 className="success-title">¡Registro Exitoso!</h2>
            <p className="success-message">
              Tu cuenta ha sido creada correctamente. Un administrador debe habilitarte como maestro o directivo para que puedas acceder al sistema.
            </p>
            <div className="button-group">
              <button
                onClick={() => setSuccess(false)}
                className="btn btn-primary btn-full"
              >
                Registrar otro usuario
              </button>
              <button
                onClick={onGoToLogin}
                className="btn btn-secondary btn-full"
              >
                Ir a iniciar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1 className="register-title">Registro de Usuario</h1>
          <p className="register-subtitle">Sistema de Gestión Escolar</p>
        </div>

        {errors.general && (
          <div className="alert alert-error">
            <AlertCircle />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Nombre de usuario */}
        <div className="form-group">
          <label className="form-label required">
            Nombre de usuario
          </label>
          <div className="form-input-wrapper">
            <User className="form-icon" />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`form-input has-icon ${errors.username ? 'error' : ''}`}
              placeholder="Ingresa tu nombre de usuario"
            />
          </div>
          {errors.username && (
            <p className="form-error">{errors.username}</p>
          )}
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label required">
            Email
          </label>
          <div className="form-input-wrapper">
            <Mail className="form-icon" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input has-icon ${errors.email ? 'error' : ''}`}
              placeholder="tu@email.com"
            />
          </div>
          {errors.email && (
            <p className="form-error">{errors.email}</p>
          )}
        </div>

        <div className="form-grid">
          {/* Nombre */}
          <div className="form-group">
            <label className="form-label required">
              Nombre
            </label>
            <div className="form-input-wrapper">
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={`form-input ${errors.first_name ? 'error' : ''}`}
              placeholder="Tu nombre"
            />
            </div>
            {errors.first_name && (
              <p className="form-error">{errors.first_name}</p>
            )}
          </div>

          {/* Apellido */}
          <div className="form-group">
            <label className="form-label required">
              Apellido
            </label>
            <div className="form-input-wrapper">
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className={`form-input ${errors.last_name ? 'error' : ''}`}
              placeholder="Tu apellido"
            />
            </div>
            {errors.last_name && (
              <p className="form-error">{errors.last_name}</p>
            )}
          </div>

          {/* DNI */}
          <div className="form-group">
            <label className="form-label required">
              DNI
            </label>
            <div className="form-input-wrapper">
            <input
              type="text"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
              className={`form-input ${errors.dni ? 'error' : ''}`}
              placeholder="12345678"
              maxLength={10}
            />
            </div>
            {errors.dni && (
              <p className="form-error">{errors.dni}</p>
            )}
          </div>

          {/* Teléfono */}
          <div className="form-group">
            <label className="form-label">
              Teléfono
            </label>
            <div className="form-input-wrapper">
              <Phone className="form-icon" />
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="form-input has-icon"
                placeholder="+54 11 1234-5678"
              />
            </div>
          </div>

          {/* Fecha de nacimiento */}
          <div className="form-group">
            <label className="form-label required">
              Fecha de nacimiento
            </label>
            <div className="form-input-wrapper">
              <Calendar className="form-icon" />
              <input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                className={`form-input has-icon ${errors.fecha_nacimiento ? 'error' : ''}`}
              />
            </div>
            {errors.fecha_nacimiento && (
              <p className="form-error">{errors.fecha_nacimiento}</p>
            )}
          </div>

          {/* Contraseña */}
          <div className="form-group">
            <label className="form-label required">
              Contraseña
            </label>
            <div className="form-input-wrapper">
              <Lock className="form-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input has-icon has-toggle ${errors.password ? 'error' : ''}`}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('password')}
                className="password-toggle"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && (
              <p className="form-error">{errors.password}</p>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div className="form-group">
            <label className="form-label required">
              Confirmar contraseña
            </label>
            <div className="form-input-wrapper">
              <Lock className="form-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input has-icon has-toggle ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Repite tu contraseña"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirmPassword')}
                className="password-toggle"
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="form-error">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Dirección - Campo completo */}
        <div className="form-group">
          <label className="form-label">
            Dirección
          </label>
          <div className="form-input-wrapper">
            <MapPin className="form-icon" />
            <textarea
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              rows={3}
              className="form-textarea"
              placeholder="Tu dirección completa (opcional)"
            />
          </div>
        </div>

        {/* Botón de registro */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn btn-primary btn-full"
        >
          {loading ? 'Registrando...' : 'Registrar Usuario'}
        </button>

        {/* Enlace a login */}
        <div className="form-footer">
          <p>
            ¿Ya tienes una cuenta?{' '}
            <button
              type="button"
              className="form-link"
              onClick={onGoToLogin || (() => {
                window.location.href = '/login';
              })}
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>

        <div className="form-info">
          <p>
            Los campos marcados con * son obligatorios.
            <br />
            Después del registro, un administrador debe habilitarte para acceder al sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;