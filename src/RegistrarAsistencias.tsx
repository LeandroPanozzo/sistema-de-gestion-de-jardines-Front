import React, { useState, useEffect } from 'react';
import { handleAPIError, UserData } from './config/api';
import { Clock, User, Calendar, CheckCircle, AlertCircle, ArrowLeft, UserX, School } from 'lucide-react';
import api from './config/api';
import { AxiosError } from 'axios';
import './RegistrarAsistencias.css';

// Props interface for the component
interface RegistrarAsistenciasProps {
  user: UserData;
  onBack: () => void;
}

// Interfaces
interface Usuario {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  es_directivo: boolean;
  es_maestro: boolean;
}

interface AvisoDirectivo {
  id: number;
  tipo: 'ingreso' | 'salida';
  maestro_nombre: string;
  curso_nombre: string;
  fecha: string;
  hora_solicitada: string;
}

interface CursoEnHorario {
  id: number;
  nombre: string;
  horario: string;
  turno: string;
  maestros: MaestroEnCurso[];
}

interface MaestroEnCurso {
  id: number;
  first_name: string;
  last_name: string;
  ya_tiene_registro: boolean;
  estado_asistencia: 'sin_registro' | 'ingreso_registrado' | 'completo' | 'ausente';
}

interface APIError {
  message: string;
}

// API específica para avisos directivo
const avisoDirectivoAPI = {
  pendientes: () => api.get('/avisos-directivo/pendientes/'),
  procesar: (id: number) => api.post(`/avisos-directivo/${id}/procesar/`, {}),
};

// API para marcar inasistencias
const inasistenciaAPI = {
  cursosEnHorario: () => api.get('/asistencia-maestros/cursos_en_horario/'),
  marcarAusente: (maestroId: number, cursoId: number) => 
    api.post('/asistencia-maestros/marcar_ausente/', { maestro_id: maestroId, curso_id: cursoId }),
};

const RegistrarAsistencias: React.FC<RegistrarAsistenciasProps> = ({ user, onBack }) => {
  const [avisosPendientes, setAvisosPendientes] = useState<AvisoDirectivo[]>([]);
  const [cursosEnHorario, setCursosEnHorario] = useState<CursoEnHorario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingInasistencias, setLoadingInasistencias] = useState<boolean>(false);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [marcandoAusente, setMarcandoAusente] = useState<string | null>(null); // "maestroId-cursoId"
  const [error, setError] = useState<string>('');
  const [userData, setUserData] = useState<Usuario | null>(null);

  // Verificar permisos al cargar el componente
  useEffect(() => {
    verificarPermisos();
  }, []);

  // Cargar datos cuando el usuario esté verificado
  useEffect(() => {
    if (userData && userData.es_directivo) {
      cargarDatos();
    }
  }, [userData]);

  const verificarPermisos = async (): Promise<void> => {
    try {
      const userDataFromProps = user as Usuario;
      setUserData(userDataFromProps);

      if (!userDataFromProps.es_directivo) {
        setError('No tienes permisos para acceder a esta funcionalidad');
        setLoading(false);
        return;
      }
    } catch (err) {
      const apiError: APIError = handleAPIError(err as AxiosError);
      setError(apiError.message);
      setLoading(false);
    }
  };

  const cargarDatos = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Cargar avisos pendientes y cursos en horario en paralelo
      const [avisosResponse, cursosResponse] = await Promise.all([
        avisoDirectivoAPI.pendientes(),
        inasistenciaAPI.cursosEnHorario()
      ]);
      
      setAvisosPendientes(avisosResponse.data);
      setCursosEnHorario(cursosResponse.data);
      setError('');
    } catch (err) {
      const apiError: APIError = handleAPIError(err as AxiosError);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarCursosEnHorario = async (): Promise<void> => {
    try {
      setLoadingInasistencias(true);
      const response = await inasistenciaAPI.cursosEnHorario();
      setCursosEnHorario(response.data);
    } catch (err) {
      const apiError: APIError = handleAPIError(err as AxiosError);
      setError(apiError.message);
    } finally {
      setLoadingInasistencias(false);
    }
  };

  const procesarAviso = async (aviso: AvisoDirectivo): Promise<void> => {
    try {
      setProcesando(aviso.id);
      
      await avisoDirectivoAPI.procesar(aviso.id);

      setAvisosPendientes(prev => 
        prev.filter(avisoItem => avisoItem.id !== aviso.id)
      );

      alert(`${aviso.tipo === 'ingreso' ? 'Ingreso' : 'Salida'} registrado correctamente para ${aviso.maestro_nombre} a las ${aviso.hora_solicitada}`);
      
      // Recargar cursos en horario para actualizar estados
      cargarCursosEnHorario();
      
    } catch (err) {
      const apiError: APIError = handleAPIError(err as AxiosError);
      alert(`Error al procesar: ${apiError.message}`);
    } finally {
      setProcesando(null);
    }
  };

  const marcarMaestroAusente = async (maestro: MaestroEnCurso, curso: CursoEnHorario): Promise<void> => {
    try {
      const key = `${maestro.id}-${curso.id}`;
      setMarcandoAusente(key);
      
      await inasistenciaAPI.marcarAusente(maestro.id, curso.id);
      
      // Actualizar el estado local
      setCursosEnHorario(prev => 
        prev.map(c => 
          c.id === curso.id 
            ? {
                ...c,
                maestros: c.maestros.map(m => 
                  m.id === maestro.id 
                    ? { ...m, estado_asistencia: 'ausente' }
                    : m
                )
              }
            : c
        )
      );

      alert(`${maestro.first_name} ${maestro.last_name} marcado como ausente en ${curso.nombre}`);
      
    } catch (err) {
      const apiError: APIError = handleAPIError(err as AxiosError);
      alert(`Error al marcar ausente: ${apiError.message}`);
    } finally {
      setMarcandoAusente(null);
    }
  };

  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getEstadoColor = (estado: string): string => {
    switch (estado) {
      case 'ausente': return 'text-red-600';
      case 'completo': return 'text-green-600';
      case 'ingreso_registrado': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getEstadoTexto = (estado: string): string => {
    switch (estado) {
      case 'ausente': return 'Ausente';
      case 'completo': return 'Completo';
      case 'ingreso_registrado': return 'Solo ingreso';
      default: return 'Sin registro';
    }
  };

  // Si no tiene permisos, mostrar mensaje de error
  if (error && !userData) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <div className="access-denied-icon">
            <AlertCircle />
          </div>
          <h2 className="access-denied-title">Acceso Denegado</h2>
          <p className="access-denied-description">{error}</p>
          <button
            onClick={onBack}
            className="access-denied-button"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="registrar-asistencias-container">
      <div className="registrar-asistencias-content">
        {/* Header */}
        <div className="registrar-header">
          <button
            onClick={onBack}
            className="back-button"
          >
            <ArrowLeft />
            <span>Volver</span>
          </button>
          
          <h1 className="registrar-title">
            Registrar Asistencias de Maestros
          </h1>
          <p className="registrar-subtitle">
            Procesa los avisos de ingreso y salida de los maestros y marca inasistencias
          </p>
        </div>

        {/* Botón de actualizar */}
        <button
          onClick={cargarDatos}
          disabled={loading}
          className="update-button"
        >
          {loading ? 'Actualizando...' : 'Actualizar Datos'}
        </button>

        {/* Error general */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* SECCIÓN: Avisos Pendientes */}
        <div className="section-container">
          <h2 className="section-title">
            <CheckCircle className="section-icon" />
            Avisos Pendientes de Asistencia
          </h2>
          
          {avisosPendientes.length === 0 ? (
            <div className="no-avisos-card">
              <div className="no-avisos-icon">
                <CheckCircle />
              </div>
              <h3 className="no-avisos-title">
                No hay avisos pendientes
              </h3>
              <p className="no-avisos-description">
                Todos los avisos de asistencia han sido procesados.
              </p>
            </div>
          ) : (
            <div className="avisos-list">
              {avisosPendientes.map((aviso) => (
                <div
                  key={aviso.id}
                  className={`aviso-card ${aviso.tipo}`}
                >
                  <div className="aviso-content">
                    <div className="aviso-info">
                      <div className="aviso-header">
                        <div className={`aviso-type-icon ${aviso.tipo}`}>
                          <Clock />
                        </div>
                        <div className="aviso-header-text">
                          <h3>
                            {aviso.tipo === 'ingreso' ? 'Solicitud de Ingreso' : 'Solicitud de Salida'}
                          </h3>
                          <p>
                            {aviso.tipo === 'ingreso' 
                              ? `El maestro solicita registrar su hora de ingreso a las ${aviso.hora_solicitada}` 
                              : `El maestro solicita registrar su hora de salida a las ${aviso.hora_solicitada}`}
                          </p>
                        </div>
                      </div>

                      <div className="aviso-details">
                        <div className="aviso-detail">
                          <User />
                          <span className="aviso-detail-label">Maestro:</span>
                          <span className="aviso-detail-value">{aviso.maestro_nombre}</span>
                        </div>
                        
                        <div className="aviso-detail">
                          <Calendar />
                          <span className="aviso-detail-label">Fecha:</span>
                          <span className="aviso-detail-value">{formatearFecha(aviso.fecha)}</span>
                        </div>
                        
                        <div className="aviso-detail">
                          <School />
                          <span className="aviso-detail-label">Curso:</span>
                          <span className="aviso-detail-value">{aviso.curso_nombre}</span>
                        </div>

                        <div className="aviso-detail">
                          <Clock />
                          <span className="aviso-detail-label">Hora solicitada:</span>
                          <span className="aviso-detail-value hora-solicitada">{aviso.hora_solicitada}</span>
                        </div>
                      </div>
                    </div>

                    <div className="aviso-action">
                      <button
                        onClick={() => procesarAviso(aviso)}
                        disabled={procesando === aviso.id}
                        className={`confirm-button ${aviso.tipo} ${procesando === aviso.id ? 'processing' : ''}`}
                      >
                        {procesando === aviso.id ? (
                          <>
                            <Clock />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CheckCircle />
                            Confirmar {aviso.hora_solicitada}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECCIÓN: Marcar Inasistencias */}
        <div className="section-container">
          <h2 className="section-title">
            <UserX className="section-icon" />
            Marcar Inasistencias
          </h2>
          
          <div className="section-subtitle">
            Cursos que están en horario actual - Puedes marcar maestros como ausentes
          </div>

          <button
            onClick={cargarCursosEnHorario}
            disabled={loadingInasistencias}
            className="update-button-secondary"
          >
            {loadingInasistencias ? 'Actualizando...' : 'Actualizar Cursos en Horario'}
          </button>

          {cursosEnHorario.length === 0 ? (
            <div className="no-cursos-card">
              <div className="no-cursos-icon">
                <Clock />
              </div>
              <h3 className="no-cursos-title">
                No hay cursos en horario actual
              </h3>
              <p className="no-cursos-description">
                No hay cursos que estén en horario en este momento.
              </p>
            </div>
          ) : (
            <div className="cursos-list">
              {cursosEnHorario.map((curso) => (
                <div key={curso.id} className="curso-card">
                  <div className="curso-header">
                    <div className="curso-info">
                      <h3 className="curso-nombre">{curso.nombre}</h3>
                      <div className="curso-details">
                        <span className="curso-horario">
                          <Clock size={16} />
                          {curso.horario}
                        </span>
                        <span className="curso-turno">
                          {curso.turno}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="maestros-list">
                    {curso.maestros.map((maestro) => (
                      <div key={maestro.id} className="maestro-item">
                        <div className="maestro-info">
                          <div className="maestro-nombre">
                            <User size={16} />
                            {maestro.first_name} {maestro.last_name}
                          </div>
                          <div className={`maestro-estado ${getEstadoColor(maestro.estado_asistencia)}`}>
                            {getEstadoTexto(maestro.estado_asistencia)}
                          </div>
                        </div>

                        <div className="maestro-actions">
                          {maestro.estado_asistencia !== 'ausente' ? (
                            <button
                              onClick={() => marcarMaestroAusente(maestro, curso)}
                              disabled={marcandoAusente === `${maestro.id}-${curso.id}`}
                              className="marcar-ausente-button"
                            >
                              {marcandoAusente === `${maestro.id}-${curso.id}` ? (
                                <>
                                  <Clock size={16} />
                                  Marcando...
                                </>
                              ) : (
                                <>
                                  <UserX size={16} />
                                  Marcar Ausente
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="ya-ausente">
                              <UserX size={16} />
                              Ya marcado como ausente
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrarAsistencias;