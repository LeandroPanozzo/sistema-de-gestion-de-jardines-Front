// src/config/api.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Types
interface APIError {
  type: 'validation' | 'auth' | 'permission' | 'notfound' | 'server' | 'network' | 'unknown';
  message: string;
  errors?: Record<string, any>;
}

interface LoginCredentials {
  username: string;
  password: string;
}

// Exportar UserData para usar en otros componentes
export interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  es_maestro: boolean;
  es_directivo: boolean;
}

interface LoginResponse {
  token: string;
  user: UserData;
}
export interface CursoEnHorario {
  id: number;
  nombre: string;
  horario: string;
  turno: string;
  maestros: MaestroEnCurso[];
}

export interface MaestroEnCurso {
  id: number;
  first_name: string;
  last_name: string;
  ya_tiene_registro: boolean;
  estado_asistencia: 'sin_registro' | 'ingreso_registrado' | 'completo' | 'ausente';
}
// Configuración base de la API
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://tu-dominio.com/api' 
  : 'http://localhost:8000/api';

// Crear instancia de Axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Funciones para manejar el token usando sessionStorage
const TOKEN_KEY = 'auth_token';

export const setAuthToken = (token: string | null): void => {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common['Authorization'] = `Token ${token}`;
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = (): string | null => {
  return sessionStorage.getItem(TOKEN_KEY);
};

export const clearAuthToken = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
  delete api.defaults.headers.common['Authorization'];
};

// Inicializar token al cargar la aplicación
const initializeToken = () => {
  const token = getAuthToken();
  if (token) {
    api.defaults.headers.common['Authorization'] = `Token ${token}`;
  }
};

// Llamar la inicialización
initializeToken();

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Agregar token si existe
    const token = getAuthToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Manejar errores globalmente
    if (error.response?.status === 401) {
      // Token inválido o expirado
      clearAuthToken();
      // Aquí podrías disparar un evento o callback para redirigir al login
      console.warn('Token expirado o inválido');
    }
    
    // Formatear errores de validación de Django REST Framework
    if (error.response?.data) {
      const errorData = error.response.data as any;
      
      // Si hay errores de campo específicos
      if (typeof errorData === 'object' && !Array.isArray(errorData)) {
        const formattedErrors: Record<string, any> = {};
        
        Object.keys(errorData).forEach(field => {
          if (Array.isArray(errorData[field])) {
            formattedErrors[field] = errorData[field][0];
          } else {
            formattedErrors[field] = errorData[field];
          }
        });
        
        (error as any).formattedErrors = formattedErrors;
      }
    }
    
    return Promise.reject(error);
  }
);

// Servicios de API organizados por endpoints
export const authAPI = {
  login: (credentials: LoginCredentials): Promise<AxiosResponse<LoginResponse>> => 
    api.post('/auth/login/', credentials),
  logout: (): Promise<AxiosResponse> => api.post('/auth/logout/'),
  register: (userData: any): Promise<AxiosResponse> => api.post('/users/', userData),
  // Agregar método para obtener usuario actual
  getCurrentUser: (): Promise<AxiosResponse<UserData>> => api.get('/auth/me/'),
};

export const userAPI = {
  getAll: (): Promise<AxiosResponse> => api.get('/users/'),
  getById: (id: number): Promise<AxiosResponse> => api.get(`/users/${id}/`),
  create: (userData: any): Promise<AxiosResponse> => api.post('/users/', userData),
  update: (id: number, userData: any): Promise<AxiosResponse> => api.patch(`/users/${id}/`, userData),
  delete: (id: number): Promise<AxiosResponse> => api.delete(`/users/${id}/`),
  habilitar: (id: number, habilitaciones: any): Promise<AxiosResponse> => 
    api.post(`/users/${id}/habilitar/`, habilitaciones),
  // Nuevo método para verificar disponibilidad de username
  checkUsername: (username: string, excludeUserId?: number): Promise<AxiosResponse> => {
    const params = new URLSearchParams({ username });
    if (excludeUserId) {
      params.append('exclude_user_id', excludeUserId.toString());
    }
    return api.get(`/users/check_username/?${params}`);
  },
};

export const cursoAPI = {
  getAll: (): Promise<AxiosResponse> => api.get('/cursos/'),
  getById: (id: number): Promise<AxiosResponse> => api.get(`/cursos/${id}/`),
  create: (cursoData: any): Promise<AxiosResponse> => api.post('/cursos/', cursoData),
  update: (id: number, cursoData: any): Promise<AxiosResponse> => api.patch(`/cursos/${id}/`, cursoData),
  delete: (id: number): Promise<AxiosResponse> => api.delete(`/cursos/${id}/`),
  misCursos: (): Promise<AxiosResponse> => api.get('/cursos/mis_cursos/'),
  asignarMaestro: (id: number, asignacionData: any): Promise<AxiosResponse> => 
    api.post(`/cursos/${id}/asignar_maestro/`, asignacionData),
};

export const alumnoAPI = {
  getAll: (): Promise<AxiosResponse> => api.get('/alumnos/'),
  getById: (id: number): Promise<AxiosResponse> => api.get(`/alumnos/${id}/`),
  create: (alumnoData: any): Promise<AxiosResponse> => api.post('/alumnos/', alumnoData),
  update: (id: number, alumnoData: any): Promise<AxiosResponse> => api.patch(`/alumnos/${id}/`, alumnoData),
  delete: (id: number): Promise<AxiosResponse> => api.delete(`/alumnos/${id}/`),
  misAlumnos: (): Promise<AxiosResponse> => api.get('/alumnos/mis_alumnos/'),
};

export const familiarAPI = {
  getAll: (): Promise<AxiosResponse> => api.get('/familiares/'),
  getById: (id: number): Promise<AxiosResponse> => api.get(`/familiares/${id}/`),
  create: (familiarData: any): Promise<AxiosResponse> => api.post('/familiares/', familiarData),
  update: (id: number, familiarData: any): Promise<AxiosResponse> => api.patch(`/familiares/${id}/`, familiarData),
  delete: (id: number): Promise<AxiosResponse> => api.delete(`/familiares/${id}/`),
};

export const asistenciaAPI = {
  getAll: (): Promise<AxiosResponse> => api.get('/asistencia-maestros/'),
  
  // Nuevo endpoint para obtener registros de hoy
  misRegistrosHoy: (): Promise<AxiosResponse> => api.get('/asistencia-maestros/mis_registros_hoy/'),
  
  estadoRegistro: (): Promise<AxiosResponse> => api.get('/asistencia-maestros/estado_registro/'),
  
  // CORREGIDO: Funciones que reciben curso_id y hora como parámetros separados
  registrarIngreso: (cursoId: number, horaIngreso: string): Promise<AxiosResponse> => {
    console.log('API: Enviando ingreso para curso:', cursoId, 'hora:', horaIngreso);
    return api.post('/asistencia-maestros/registrar_ingreso/', { 
      curso_id: cursoId,
      hora_ingreso: horaIngreso 
    });
  },
  cursosEnHorario: (): Promise<AxiosResponse> => api.get('/asistencia-maestros/cursos_en_horario/'),
  
  marcarAusente: (maestroId: number, cursoId: number): Promise<AxiosResponse> => {
    console.log('API: Marcando ausente maestro:', maestroId, 'en curso:', cursoId);
    return api.post('/asistencia-maestros/marcar_ausente/', { 
      maestro_id: maestroId,
      curso_id: cursoId 
    });
  },
  registrarSalida: (cursoId: number, horaSalida: string): Promise<AxiosResponse> => {
    console.log('API: Enviando salida para curso:', cursoId, 'hora:', horaSalida);
    return api.post('/asistencia-maestros/registrar_salida/', { 
      curso_id: cursoId,
      hora_salida: horaSalida 
    });
  },
  // AGREGAR ESTAS DOS NUEVAS FUNCIONES:
  avisarDirectivoIngreso: (cursoId: number): Promise<AxiosResponse> => {
    console.log('API: Enviando aviso de ingreso al directivo para curso:', cursoId);
    return api.post('/asistencia-maestros/avisar_directivo_ingreso/', { 
      curso_id: cursoId
    });
  },
  
  avisarDirectivoSalida: (cursoId: number): Promise<AxiosResponse> => {
    console.log('API: Enviando aviso de salida al directivo para curso:', cursoId);
    return api.post('/asistencia-maestros/avisar_directivo_salida/', { 
      curso_id: cursoId
    });
  },
};

// También mejora la función de manejo de errores para ser más específica:
export const handleAPIError = (error: AxiosError): APIError => {
  console.log('Handling API error:', error);
  
  if (error.response) {
    // Error de respuesta del servidor
    const status = error.response.status;
    const data = error.response.data as any;
    
    console.log('Error response data:', data);
    console.log('Error response status:', status);
    
    switch (status) {
      case 400:
        // Mejorar el manejo de errores de validación
        let validationMessage = 'Datos inválidos';
        
        // Si el error tiene una estructura específica de Django REST Framework
        if (typeof data === 'object' && !Array.isArray(data)) {
          if (data.detail) {
            validationMessage = data.detail;
          } else if (data.error) {
            validationMessage = data.error;
          } else {
            // Formatear errores de campo
            const fieldErrors = Object.entries(data)
              .filter(([, value]) => Array.isArray(value) || typeof value === 'string')
              .map(([field, messages]) => {
                if (Array.isArray(messages)) {
                  return `${field}: ${messages.join(', ')}`;
                }
                return `${field}: ${messages}`;
              });
            
            if (fieldErrors.length > 0) {
              validationMessage = fieldErrors.join('; ');
            }
          }
        }
        
        return {
          type: 'validation',
          message: validationMessage,
          errors: (error as any).formattedErrors || data,
        };
        
      case 401:
        return {
          type: 'auth',
          message: 'No autorizado. Inicia sesión nuevamente.',
        };
      case 403:
        return {
          type: 'permission',
          message: data?.error || data?.detail || 'No tienes permisos para realizar esta acción.',
        };
      case 404:
        return {
          type: 'notfound',
          message: 'Recurso no encontrado.',
        };
      case 500:
        return {
          type: 'server',
          message: 'Error interno del servidor.',
        };
      default:
        return {
          type: 'unknown',
          message: `Error ${status}: ${data?.message || data?.detail || 'Error desconocido'}`,
        };
    }
  } else if (error.request) {
    // Error de red
    return {
      type: 'network',
      message: 'Error de conexión. Verifica tu conexión a internet.',
    };
  } else {
    // Error desconocido
    return {
      type: 'unknown',
      message: error.message || 'Error desconocido',
    };
  }
};
export const asistenciaAlumnoAPI = {
  getAll: (): Promise<AxiosResponse> => api.get('/asistencia-alumnos/'),
  create: (asistenciaData: any): Promise<AxiosResponse> => api.post('/asistencia-alumnos/', asistenciaData),
  update: (id: number, asistenciaData: any): Promise<AxiosResponse> => api.patch(`/asistencia-alumnos/${id}/`, asistenciaData),
  getByCursoAndFecha: (cursoId: number, fecha: string): Promise<AxiosResponse> => 
    api.get(`/asistencia-alumnos/?curso=${cursoId}&fecha=${fecha}`),
  
  // AGREGAR ESTA FUNCIÓN:
  getByFecha: (fecha: string): Promise<AxiosResponse> => 
    api.get(`/asistencia-alumnos/?fecha=${fecha}`),
    
  registrarAsistenciaMasiva: (asistenciaData: any): Promise<AxiosResponse> => 
    api.post('/asistencia-alumnos/registrar_masiva/', asistenciaData),
};

// Y también agregar esta función a retiroAPI:
export const retiroAPI = {
  getAll: (): Promise<AxiosResponse> => api.get('/retiros-alumnos/'),
  create: (retiroData: any): Promise<AxiosResponse> => api.post('/retiros-alumnos/', retiroData),
  getByCursoAndFecha: (cursoId: number, fecha: string): Promise<AxiosResponse> => 
    api.get(`/retiros-alumnos/?curso=${cursoId}&fecha=${fecha}`),
    
  // AGREGAR ESTA FUNCIÓN:
  getByFecha: (fecha: string): Promise<AxiosResponse> => 
    api.get(`/retiros-alumnos/?fecha=${fecha}`),
};
export const cuotaAPI = {
  getAll: (): Promise<AxiosResponse> => api.get('/cuotas/'),
  create: (cuotaData: any): Promise<AxiosResponse> => api.post('/cuotas/', cuotaData),
  update: (id: number, cuotaData: any): Promise<AxiosResponse> => api.patch(`/cuotas/${id}/`, cuotaData),
  delete: (id: number): Promise<AxiosResponse> => api.delete(`/cuotas/${id}/`),
};

export const pagoAPI = {
  getAll: (): Promise<AxiosResponse> => api.get('/pagos/'),
  create: (pagoData: any): Promise<AxiosResponse> => api.post('/pagos/', pagoData),
};

export const configuracionAPI = {
  getActual: (): Promise<AxiosResponse> => api.get('/configuracion/actual/'),
  toggleRegistroAsistencia: (): Promise<AxiosResponse> => api.post('/configuracion/toggle_registro_asistencia/'),
  configurarRegistroAsistencia: (habilitar: boolean): Promise<AxiosResponse> => 
    api.post('/configuracion/configurar_registro_asistencia/', { habilitar }),
};

export const cicloLectivoAPI = {
  getAll: (): Promise<AxiosResponse> => api.get('/ciclos-lectivos/'),
  create: (cicloData: any): Promise<AxiosResponse> => api.post('/ciclos-lectivos/', cicloData),
  update: (id: number, cicloData: any): Promise<AxiosResponse> => api.patch(`/ciclos-lectivos/${id}/`, cicloData),
  delete: (id: number): Promise<AxiosResponse> => api.delete(`/ciclos-lectivos/${id}/`),
};
export const passwordResetAPI = {
  // Solicitar recuperación de contraseña
  forgotPassword: (email: any) => {
    return api.post('/auth/forgot-password/', { email });
  },

  // Solicitar recordatorio de usuario
  forgotUsername: (email: any) => {
    return api.post('/auth/forgot-username/', { email });
  },

  // Verificar token de recuperación
  verifyResetToken: (token: any) => {
    return api.post('/auth/verify-reset-token/', { token });
  },

  // Cambiar contraseña con token
  resetPassword: (token: any, newPassword: any, confirmPassword: any) => {
    return api.post('/auth/reset-password/', {
      token,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
  }
};

export default api;