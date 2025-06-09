import React, { useState, useEffect } from 'react';
import { User, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { userAPI, handleAPIError, UserData } from './config/api';
import './users.css';

interface UsersPageProps {
  user: UserData;
  onBack?: () => void;
}

interface FormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  dni: string;
  telefono: string;
  direccion: string;
  fecha_nacimiento: string;
  password?: string;
  confirmPassword?: string;
}

const UsersPage: React.FC<UsersPageProps> = ({ user, onBack }) => {
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameTimer, setUsernameTimer] = useState<NodeJS.Timeout | null>(null);

  // Funciones para convertir fechas
  const formatDateToISO = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Si ya está en formato ISO (yyyy-mm-dd), devolver tal como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Si está en formato dd/mm/yyyy, convertir a ISO
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return dateStr;
  };

  const formatDateToDDMMYYYY = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Si está en formato ISO (yyyy-mm-dd), convertir a dd/mm/yyyy
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${parseInt(day)}/${parseInt(month)}/${year}`;
    }
    
    return dateStr;
  };

  const validateDateFormat = (dateStr: string): boolean => {
    if (!dateStr) return true; // Campo opcional
    
    // Validar formato dd/mm/yyyy
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!dateRegex.test(dateStr)) return false;
    
    const [day, month, year] = dateStr.split('/').map(Number);
    
    // Validar rangos básicos
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    
    // Validar fecha específica
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  };

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    loadUserData();
  }, [user.id]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getById(user.id);
      const userData = response.data;
      
      setFormData({
        username: userData.username || '',
        email: userData.email || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        dni: userData.dni || '',
        telefono: userData.telefono || '',
        direccion: userData.direccion || '',
        fecha_nacimiento: formatDateToDDMMYYYY(userData.fecha_nacimiento || ''),
        password: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      const apiError = handleAPIError(error);
      setMessage({ type: 'error', text: apiError.message });
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar disponibilidad del username
  const checkUsernameAvailability = async (username: string, currentUserId: number) => {
    try {
      setCheckingUsername(true);
      const response = await userAPI.checkUsername(username, currentUserId);
      return response.data.available;
    } catch (error) {
      console.error('Error checking username:', error);
      return true;
    } finally {
      setCheckingUsername(false);
    }
  };

  // Modificar handleInputChange para incluir verificación de username y manejo de fechas
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Verificación especial para username
    if (name === 'username' && value.trim()) {
      if (usernameTimer) {
        clearTimeout(usernameTimer);
      }

      const timer = setTimeout(async () => {
        const isAvailable = await checkUsernameAvailability(value.trim(), user.id);
        if (!isAvailable) {
          setErrors(prev => ({
            ...prev,
            username: 'Este nombre de usuario ya está en uso'
          }));
        }
      }, 500);

      setUsernameTimer(timer);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validaciones básicas
    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
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
    } else if (!/^\d{7,8}$/.test(formData.dni)) {
      newErrors.dni = 'El DNI debe tener 7 u 8 dígitos';
    }

    // Validación de fecha
    if (formData.fecha_nacimiento && !validateDateFormat(formData.fecha_nacimiento)) {
      newErrors.fecha_nacimiento = 'Fecha inválida. Use el formato dd/mm/yyyy';
    }

    // Validación de contraseña si se quiere cambiar
    if (changePassword) {
      if (!formData.password || formData.password.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      // Preparar datos para enviar
      const updateData: any = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        dni: formData.dni,
        telefono: formData.telefono,
        direccion: formData.direccion,
        fecha_nacimiento: formatDateToISO(formData.fecha_nacimiento) || null
      };

      // Incluir contraseña solo si se quiere cambiar
      if (changePassword && formData.password) {
        updateData.password = formData.password;
      }

      await userAPI.update(user.id, updateData);
      
      setMessage({ 
        type: 'success', 
        text: 'Datos actualizados correctamente' 
      });

      // Limpiar campos de contraseña
      if (changePassword) {
        setFormData(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
        setChangePassword(false);
      }

    } catch (error: any) {
      const apiError = handleAPIError(error);
      
      // Si hay errores de campo específicos, mostrarlos
      if (apiError.errors) {
        setErrors(apiError.errors);
      }
      
      setMessage({ 
        type: 'error', 
        text: apiError.message 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="users-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando datos del usuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <div className="header-left">
          <button onClick={onBack} className="back-btn">
            <ArrowLeft />
            Volver
          </button>
          <div className="page-title">
            <User className="title-icon" />
            <h1>Editar Perfil</h1>
          </div>
        </div>
      </div>

      <div className="users-content">
        <form onSubmit={handleSubmit} className="user-form">
          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="form-section">
            <h3>Información Personal</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">Nombre *</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className={errors.first_name ? 'error' : ''}
                />
                {errors.first_name && <span className="error-text">{errors.first_name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="last_name">Apellido *</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className={errors.last_name ? 'error' : ''}
                />
                {errors.last_name && <span className="error-text">{errors.last_name}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dni">DNI *</label>
                <input
                  type="text"
                  id="dni"
                  name="dni"
                  value={formData.dni}
                  onChange={handleInputChange}
                  className={errors.dni ? 'error' : ''}
                  placeholder="12345678"
                />
                {errors.dni && <span className="error-text">{errors.dni}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="fecha_nacimiento">Fecha de Nacimiento</label>
                <input
                  type="text"
                  id="fecha_nacimiento"
                  name="fecha_nacimiento"
                  value={formData.fecha_nacimiento}
                  onChange={handleInputChange}
                  className={errors.fecha_nacimiento ? 'error' : ''}
                  placeholder="dd/mm/yyyy"
                />
                {errors.fecha_nacimiento && <span className="error-text">{errors.fecha_nacimiento}</span>}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Información de Contacto</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="telefono">Teléfono</label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder="3794123456"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="direccion">Dirección</label>
              <textarea
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                rows={3}
                placeholder="Dirección completa"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Credenciales de Acceso</h3>
            
            <div className="form-group">
              <label htmlFor="username">Nombre de Usuario *</label>
              <div className="input-container">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={errors.username ? 'error' : ''}
                />
                {checkingUsername && <span className="checking-indicator">Verificando...</span>}
              </div>
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

            <div className="password-section">
              <div className="password-toggle">
                <input
                  type="checkbox"
                  id="changePassword"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                />
                <label htmlFor="changePassword">Cambiar contraseña</label>
              </div>

              {changePassword && (
                <div className="password-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="password">Nueva Contraseña *</label>
                      <div className="password-input">
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className={errors.password ? 'error' : ''}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                      {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
                      <div className="password-input">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className={errors.confirmPassword ? 'error' : ''}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff /> : <Eye />}
                        </button>
                      </div>
                      {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="save-btn"
              disabled={saving}
            >
              <Save />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsersPage;