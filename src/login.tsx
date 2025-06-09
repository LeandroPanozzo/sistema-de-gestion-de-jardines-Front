import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle, LogIn, HelpCircle } from 'lucide-react';
import { authAPI, setAuthToken, handleAPIError } from './config/api';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import './Login.css';

interface LoginData {
  username: string;
  password: string;
}

interface LoginErrors {
  [key: string]: string;
}

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  es_maestro: boolean;
  es_directivo: boolean;
}

interface LoginProps {
  onGoToRegister?: () => void;
  onLoginSuccess?: (user: UserData) => void;
}

type ViewType = 'login' | 'forgot-password' | 'reset-password';

const Login: React.FC<LoginProps> = ({ onGoToRegister, onLoginSuccess }) => {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [resetToken, setResetToken] = useState<string>(''); // Para pasar el token al componente de reset
  const [formData, setFormData] = useState<LoginData>({
    username: '',
    password: ''
  });

  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
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

  const validateForm = (): LoginErrors => {
    const newErrors: LoginErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    }

    return newErrors;
  };

  const handleSubmit = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await authAPI.login(formData);
      const loginData = response.data;
      
      // Guardar el token usando nuestra función de configuración
      setAuthToken(loginData.token);
      
      console.log('Login exitoso:', loginData);
      
      // Verificar que el usuario tenga permisos
      if (!loginData.user.es_directivo && !loginData.user.es_maestro) {
        setErrors({ 
          general: 'Tu cuenta aún no ha sido habilitada por un administrador. Contacta al directivo para obtener acceso.' 
        });
        return;
      }
      
      // Llamar al callback de éxito para redirigir al Home
      if (onLoginSuccess) {
        onLoginSuccess(loginData.user);
      }
      
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      
      // Usar nuestro manejador de errores
      const apiError = handleAPIError(error);
      
      if (apiError.type === 'validation' && apiError.errors) {
        // Errores de validación específicos de campo
        const newErrors: LoginErrors = {};
        
        if (apiError.errors) {
          Object.keys(apiError.errors).forEach(field => {
            const fieldError = apiError.errors![field];
            
            if (field === 'non_field_errors') {
              newErrors.general = Array.isArray(fieldError) 
                ? fieldError[0] 
                : fieldError;
            } else {
              newErrors[field] = Array.isArray(fieldError) 
                ? fieldError[0] 
                : fieldError;
            }
          });
        }
        
        // Si no hay errores específicos de campo, mostrar error general
        if (Object.keys(newErrors).length === 0) {
          newErrors.general = 'Credenciales inválidas. Verifica tu nombre de usuario y contraseña.';
        }
        
        setErrors(newErrors);
      } else {
        // Otros tipos de errores
        setErrors({ 
          general: apiError.message || 'Error de conexión. Verifica que el servidor esté funcionando.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const togglePasswordVisibility = (): void => {
    setShowPassword(!showPassword);
  };

  const goToLogin = () => {
    setCurrentView('login');
    setErrors({});
    setResetToken(''); // Limpiar token al volver
  };

  const goToResetPassword = (token?: string) => {
    setCurrentView('reset-password');
    if (token) {
      setResetToken(token);
    }
    setErrors({});
  };

  // Renderizar componente según la vista actual
  if (currentView === 'forgot-password') {
    return <ForgotPassword onGoToLogin={goToLogin} />;
  }

  if (currentView === 'reset-password') {
    return <ResetPassword onGoToLogin={goToLogin} token={resetToken} />;
  }

  // Vista de login principal
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <LogIn />
          </div>
          <h1 className="login-title">Iniciar Sesión</h1>
          <p className="login-subtitle">Sistema de Gestión Escolar</p>
        </div>

        {errors.general && (
          <div className="alert alert-error">
            <AlertCircle />
            <span>{errors.general}</span>
          </div>
        )}

        <div className="login-form">
          {/* Nombre de usuario */}
          <div className="form-group">
            <label className="form-label">
              Nombre de usuario
            </label>
            <div className="form-input-wrapper">
              <User className="form-icon" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                className={`form-input has-icon ${errors.username ? 'error' : ''}`}
                placeholder="Ingresa tu nombre de usuario"
                autoComplete="username"
                disabled={loading}
              />
            </div>
            {errors.username && (
              <p className="form-error">
                <AlertCircle />
                {errors.username}
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div className="form-group">
            <label className="form-label">
              Contraseña
            </label>
            <div className="form-input-wrapper">
              <Lock className="form-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                className={`form-input has-icon has-toggle ${errors.password ? 'error' : ''}`}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="password-toggle"
                disabled={loading}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && (
              <p className="form-error">
                <AlertCircle />
                {errors.password}
              </p>
            )}
          </div>

          {/* Botón de login */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading}
            className="btn btn-primary btn-full"
          >
            {loading && <span className="loading-spinner"></span>}
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>

          {/* Enlaces de recuperación */}
          <div className="recovery-links">
            <button
              type="button"
              className="recovery-link"
              onClick={() => setCurrentView('forgot-password')}
              disabled={loading}
            >
              <HelpCircle size={16} />
              ¿Olvidaste tu usuario o contraseña?
            </button>
            
            {/* NUEVA OPCIÓN: Enlace directo para resetear contraseña */}
            <button
              type="button"
              className="recovery-link"
              onClick={() => goToResetPassword()}
              disabled={loading}
            >
              <Lock size={16} />
              ¿Ya tienes un código de recuperación?
            </button>
          </div>

          {/* Enlaces adicionales */}
          <div className="form-footer">
            <p className="form-info">
              ¿No tienes una cuenta?{' '}
              <button
                type="button"
                className="form-link"
                onClick={onGoToRegister}
              >
                Regístrate aquí
              </button>
            </p>
            <p className="form-info">
              Si ya tienes una cuenta pero no puedes acceder, contacta al administrador para que habilite tu perfil.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;