import React, { useState } from 'react';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Key, User } from 'lucide-react';
import { handleAPIError, passwordResetAPI } from './config/api'; // Agregar passwordResetAPI
import './forgotpassword.css';

interface ForgotPasswordProps {
  onGoToLogin: () => void;
  onGoToResetPassword?: () => void;
}

type RecoveryType = 'password' | 'username';

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ 
  onGoToLogin, 
  onGoToResetPassword 
}) => {
  const [recoveryType, setRecoveryType] = useState<RecoveryType>('password');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('El correo electrónico es requerido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (recoveryType === 'password') {
        // Llamada a la API para recuperación de contraseña
        await passwordResetAPI.forgotPassword(email);
      } else {
        // Llamada a la API para recuperación de usuario
        await passwordResetAPI.forgotUsername(email);
      }

      setSuccess(true);
    } catch (error: any) {
      console.error('Error en recuperación:', error);
      const apiError = handleAPIError(error);
      setError(apiError.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setError('');
    setSuccess(false);
  };

  const handleRecoveryTypeChange = (type: RecoveryType) => {
    setRecoveryType(type);
    resetForm();
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon success">
              <CheckCircle />
            </div>
            <h1 className="login-title">¡Correo Enviado!</h1>
            <p className="login-subtitle">
              {recoveryType === 'password' 
                ? 'Revisa tu correo para obtener el código de recuperación'
                : 'Tu nombre de usuario ha sido enviado a tu correo'
              }
            </p>
          </div>

          <div className="success-message">
            <p>
              Hemos enviado {recoveryType === 'password' ? 'un código de recuperación' : 'tu nombre de usuario'} a <strong>{email}</strong>
            </p>
            <p>
              {recoveryType === 'password' && 'Usa el código que recibiste para crear una nueva contraseña, para ello vuelve al inicio y apreta en el botón "ya tengo un código de recuperación".'}
            </p>
          </div>

          <div className="form-footer">
            {/* Mostrar botón para ir al reset solo si es recuperación de contraseña */}
            {recoveryType === 'password' && onGoToResetPassword && (
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={onGoToResetPassword}
                style={{ marginBottom: '10px' }}
              >
                <Key size={16} />
                Ingresar código de recuperación
              </button>
            )}
            
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={onGoToLogin}
            >
              <ArrowLeft size={16} />
              Volver al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            {recoveryType === 'password' ? <Key /> : <User />}
          </div>
          <h1 className="login-title">
            {recoveryType === 'password' ? '¿Olvidaste tu contraseña?' : '¿Olvidaste tu usuario?'}
          </h1>
          <p className="login-subtitle">
            {recoveryType === 'password' 
              ? 'Te enviaremos un código para crear una nueva contraseña'
              : 'Te recordaremos tu nombre de usuario'
            }
          </p>
        </div>

        {/* Selector de tipo de recuperación */}
        <div className="recovery-type-selector">
          <button
            type="button"
            className={`recovery-tab ${recoveryType === 'password' ? 'active' : ''}`}
            onClick={() => handleRecoveryTypeChange('password')}
          >
            <Key size={16} />
            Contraseña
          </button>
          <button
            type="button"
            className={`recovery-tab ${recoveryType === 'username' ? 'active' : ''}`}
            onClick={() => handleRecoveryTypeChange('username')}
          >
            <User size={16} />
            Usuario
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle />
            <span>{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Correo electrónico
            </label>
            <div className="form-input-wrapper">
              <Mail className="form-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input has-icon"
                placeholder="Ingresa tu correo electrónico"
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
          >
            {loading && <span className="loading-spinner"></span>}
            {loading 
              ? 'Enviando...' 
              : recoveryType === 'password' 
                ? 'Enviar código de recuperación'
                : 'Enviar nombre de usuario'
            }
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

            {/* Enlace adicional para ir directamente al reset si ya tienen código */}
            {recoveryType === 'password' && onGoToResetPassword && (
              <button
                type="button"
                className="form-link"
                onClick={onGoToResetPassword}
                style={{ marginTop: '10px' }}
              >
                <Key size={16} />
                ¿Ya tienes un código? Ingresarlo aquí
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;