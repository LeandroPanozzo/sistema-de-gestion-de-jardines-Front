
import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { passwordResetAPI, handleAPIError } from './config/api';

interface ResetPasswordProps {
  onGoToLogin: () => void;
  token?: string;
}

interface ResetPasswordData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onGoToLogin, token: initialToken }) => {
  const [formData, setFormData] = useState<ResetPasswordData>({
    token: initialToken || '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');

  // Verificar token al cargar el componente
  useEffect(() => {
    if (formData.token) {
      verifyToken();
    }
  }, [formData.token]);

  const verifyToken = async () => {
    try {
      const response = await passwordResetAPI.verifyResetToken(formData.token);
      setTokenValid(response.data.valid);
      if (response.data.valid) {
        setUsername(response.data.username);
      } else {
        setError(response.data.error || 'Token inválido');
      }
    } catch (error: any) {
      console.error('Error verificando token:', error);
      setTokenValid(false);
      setError('Error al verificar el token');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (error) {
      setError('');
    }
  };

  const validateForm = (): string | null => {
    if (!formData.token.trim()) {
      return 'El código de recuperación es requerido';
    }
    
    if (!formData.newPassword) {
      return 'La nueva contraseña es requerida';
    }
    
    if (formData.newPassword.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    
    if (!formData.confirmPassword) {
      return 'Confirma tu nueva contraseña';
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      return 'Las contraseñas no coinciden';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await passwordResetAPI.resetPassword(
        formData.token,
        formData.newPassword,
        formData.confirmPassword
      );
      
      setSuccess(true);
    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error);
      const apiError = handleAPIError(error);
      setError(apiError.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de éxito
  if (success) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon success">
              <CheckCircle />
            </div>
            <h1 className="login-title">¡Contraseña Cambiada!</h1>
            <p className="login-subtitle">
              Tu contraseña ha sido cambiada exitosamente
            </p>
          </div>

          <div className="success-message">
            <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={onGoToLogin}
          >
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  // Pantalla de token inválido
  if (tokenValid === false) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon error">
              <AlertCircle />
            </div>
            <h1 className="login-title">Token Inválido</h1>
            <p className="login-subtitle">
              El código de recuperación no es válido o ha expirado
            </p>
          </div>

          <div className="alert alert-error">
            <AlertCircle />
            <span>{error || 'Solicita un nuevo código de recuperación'}</span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={onGoToLogin}
          >
            <ArrowLeft size={16} />
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Lock />
          </div>
          <h1 className="login-title">Nueva Contraseña</h1>
          <p className="login-subtitle">
            {username ? `Cambiando contraseña para: ${username}` : 'Ingresa tu nueva contraseña'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle />
            <span>{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          {/* Código de recuperación */}
          <div className="form-group">
            <label className="form-label">
              Código de recuperación
            </label>
            <div className="form-input-wrapper">
              <Lock className="form-icon" />
              <input
                type="text"
                name="token"
                value={formData.token}
                onChange={handleChange}
                className="form-input has-icon"
                placeholder="Ingresa el código que recibiste por correo"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Nueva contraseña */}
          <div className="form-group">
            <label className="form-label">
              Nueva contraseña
            </label>
            <div className="form-input-wrapper">
              <Lock className="form-icon" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="form-input has-icon has-toggle"
                placeholder="Ingresa tu nueva contraseña"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="password-toggle"
                disabled={loading}
              >
                {showNewPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div className="form-group">
            <label className="form-label">
              Confirmar nueva contraseña
            </label>
            <div className="form-input-wrapper">
              <Lock className="form-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input has-icon has-toggle"
                placeholder="Confirma tu nueva contraseña"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="password-toggle"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
          >
            {loading && <span className="loading-spinner"></span>}
            {loading ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
          </button>

          <div className="form-footer">
            <button
              type="button"
              className="form-link"
              onClick={onGoToLogin}
            >
              <ArrowLeft size={16} />
              Volver al login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;