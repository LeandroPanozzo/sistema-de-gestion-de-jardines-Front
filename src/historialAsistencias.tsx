import React, { useState, useEffect } from 'react';
import { 
  Calendar, ArrowLeft, Users, Clock, CheckCircle, XCircle, 
  UserCheck, UserX, AlertCircle, History,
   Eye
} from 'lucide-react';
import { cursoAPI, asistenciaAlumnoAPI, retiroAPI, handleAPIError } from './config/api';
import type { UserData } from './config/api';

// Importar el CSS personalizado
import './historialAsistencia.css';

interface Curso {
  id: number;
  nombre: string;
  turno: string;
  horario: string;
}

// Interfaces actualizadas para coincidir con la estructura real de la API
interface RegistroAsistencia {
  id: number;
  alumno: number; // Solo el ID
  alumno_nombre: string; // Nombre completo
  presente: boolean;
  hora_llegada: string | null;
  maestro: number; // Solo el ID
  maestro_nombre: string; // Nombre completo
  fecha: string;
  curso: number; // Solo el ID
  curso_nombre: string; // Nombre del curso
}

// Interface para datos completos del alumno (si decides hacer llamada adicional)
interface DatosAlumno {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  edad: number;
}

interface RegistroRetiro {
  id: number;
  alumno: number; // Solo el ID
  alumno_nombre: string; // Nombre completo
  familiar: number; // Solo el ID
  familiar_nombre: string; // Nombre completo del familiar
  relacion_con_alumno: string;
  hora_retiro: string;
  maestro: number; // Solo el ID
  maestro_nombre: string; // Nombre completo
  fecha: string;
  curso: number; // Solo el ID
  curso_nombre: string; // Nombre del curso
}

interface HistorialProps {
  user: UserData;
  onBack: () => void;
}

const HistorialAsistenciaAlumnos: React.FC<HistorialProps> = ({ user, onBack }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [, setCursos] = useState<Curso[]>([]);
  const [todosLosCursos, setTodosLosCursos] = useState<Curso[]>([]); // NUEVO: Lista completa de cursos
  const [asistencias, setAsistencias] = useState<RegistroAsistencia[]>([]);
  const [retiros, setRetiros] = useState<RegistroRetiro[]>([]);
  const [] = useState<{[key: number]: DatosAlumno}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'asistencia' | 'retiro' | 'resumen'>('resumen');
  const [selectedCurso, setSelectedCurso] = useState<number | null>(null);

  useEffect(() => {
    loadCursos();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadHistorialData();
    }
  }, [selectedDate]);

  const loadCursos = async () => {
    try {
      // Cargar mis cursos (para filtros por defecto)
      const misCursosResponse = await cursoAPI.misCursos();
      setCursos(misCursosResponse.data);
      
      // NUEVO: También cargar todos los cursos para poder mostrar retiros de otros cursos
      if (user.es_directivo) {
        const todosCursosResponse = await cursoAPI.getAll();
        setTodosLosCursos(todosCursosResponse.data);
      } else {
        // Si no es directivo, usar solo sus cursos
        setTodosLosCursos(misCursosResponse.data);
      }
    } catch (err) {
      const apiError = handleAPIError(err as any);
      setError(`Error al cargar cursos: ${apiError.message}`);
    }
  };

  const loadHistorialData = async () => {
    try {
      setLoading(true);
      setError('');

      // Cargar asistencias del día
      const asistenciasResponse = await asistenciaAlumnoAPI.getByFecha(selectedDate);
      console.log('ESTRUCTURA DE ASISTENCIAS:', asistenciasResponse.data);
      console.log('PRIMER REGISTRO DE ASISTENCIA:', asistenciasResponse.data[0]);

      // Cargar retiros del día
      const retirosResponse = await retiroAPI.getByFecha(selectedDate);
      console.log('ESTRUCTURA DE RETIROS:', retirosResponse.data);
      console.log('PRIMER REGISTRO DE RETIRO:', retirosResponse.data[0]);

      setAsistencias(asistenciasResponse.data);
      setRetiros(retirosResponse.data);

    } catch (err) {
      const apiError = handleAPIError(err as any);
      setError(`Error al cargar historial: ${apiError.message}`);
    } finally {
      setLoading(false);
    }
  };

  // NUEVO: Función para obtener información de un curso por ID
  const getCursoInfo = (cursoId: number) => {
    return todosLosCursos.find(c => c.id === cursoId) || {
      id: cursoId,
      nombre: 'Curso no disponible',
      turno: '',
      horario: ''
    };
  };

  // NUEVO: Obtener lista de cursos únicos que tienen registros (asistencias o retiros)
  const getCursosConRegistros = () => {
    const cursosConAsistencia = asistencias.map(a => a.curso);
    const cursosConRetiros = retiros.map(r => r.curso);
    const todosCursosConRegistros = [...new Set([...cursosConAsistencia, ...cursosConRetiros])];
    
    return todosCursosConRegistros.map(cursoId => getCursoInfo(cursoId));
  };

  const getAsistenciasByCurso = (cursoId: number) => {
    return asistencias.filter(a => a.curso === cursoId);
  };

  const getRetirosByCurso = (cursoId: number) => {
    return retiros.filter(r => r.curso === cursoId);
  };

  const getEstadisticasCurso = (cursoId: number) => {
    const asistenciasCurso = getAsistenciasByCurso(cursoId);
    const retirosCurso = getRetirosByCurso(cursoId);
    
    const presentes = asistenciasCurso.filter(a => a.presente).length;
    const ausentes = asistenciasCurso.filter(a => !a.presente).length;
    const retirados = retirosCurso.length;
    
    return { presentes, ausentes, retirados, total: presentes + ausentes };
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'No registrado';
    return timeString.slice(0, 5); // HH:MM
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const ResumenTab = () => (
    <div className="historial-resumen">
      <div className="historial-stats-cards">
        <div className="historial-stat-card">
          <div className="historial-stat-icon presentes">
            <CheckCircle />
          </div>
          <div className="historial-stat-info">
            <h3>{asistencias.filter(a => a.presente).length}</h3>
            <p>Alumnos Presentes</p>
          </div>
        </div>
        
        <div className="historial-stat-card">
          <div className="historial-stat-icon ausentes">
            <XCircle />
          </div>
          <div className="historial-stat-info">
            <h3>{asistencias.filter(a => !a.presente).length}</h3>
            <p>Alumnos Ausentes</p>
          </div>
        </div>
        
        <div className="historial-stat-card">
          <div className="historial-stat-icon retiros">
            <UserX />
          </div>
          <div className="historial-stat-info">
            <h3>{retiros.length}</h3>
            <p>Retiros Registrados</p>
          </div>
        </div>
        
        <div className="historial-stat-card">
          <div className="historial-stat-icon cursos">
            <Users />
          </div>
          <div className="historial-stat-info">
            <h3>{getCursosConRegistros().length}</h3>
            <p>Cursos con Actividad</p>
          </div>
        </div>
      </div>

      <div className="historial-cursos-summary">
        <h3>Resumen por Curso</h3>
        {/* CAMBIADO: Usar cursos con registros en lugar de solo "mis cursos" */}
        {getCursosConRegistros().map(curso => {
          const stats = getEstadisticasCurso(curso.id);
          return (
            <div key={curso.id} className="historial-curso-summary-card">
              <div className="historial-curso-summary-header">
                <div className="historial-curso-info">
                  <h4>{curso.nombre}</h4>
                  <div className="historial-curso-meta">
                    <span className="turno">{curso.turno}</span>
                    {curso.horario && (
                      <span className="horario">
                        <Clock size={14} />
                        {curso.horario}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="historial-curso-stats">
                  <div className="stat-item presentes">
                    <CheckCircle size={16} />
                    <span>{stats.presentes} presentes</span>
                  </div>
                  <div className="stat-item ausentes">
                    <XCircle size={16} />
                    <span>{stats.ausentes} ausentes</span>
                  </div>
                  <div className="stat-item retiros">
                    <UserX size={16} />
                    <span>{stats.retirados} retiros</span>
                  </div>
                </div>
              </div>
              
              {stats.total > 0 && (
                <div className="historial-curso-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill presentes" 
                      style={{ width: `${(stats.presentes / stats.total) * 100}%` }}
                    />
                    <div 
                      className="progress-fill ausentes" 
                      style={{ width: `${(stats.ausentes / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="progress-text">
                    {((stats.presentes / stats.total) * 100).toFixed(1)}% asistencia
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const AsistenciaTab = () => (
    <div className="historial-asistencia">
      <div className="historial-filters">
        <select
          value={selectedCurso || ''}
          onChange={(e) => setSelectedCurso(e.target.value ? parseInt(e.target.value) : null)}
          className="historial-filter-select"
        >
          <option value="">Todos los cursos</option>
          {/* CAMBIADO: Usar cursos con registros en lugar de solo "mis cursos" */}
          {getCursosConRegistros().map(curso => (
            <option key={curso.id} value={curso.id}>
              {curso.nombre} - {curso.turno}
            </option>
          ))}
        </select>
      </div>

      <div className="historial-registros">
        {/* CAMBIADO: Usar cursos con registros */}
        {getCursosConRegistros()
          .filter(curso => !selectedCurso || curso.id === selectedCurso)
          .map(curso => {
            const asistenciasCurso = getAsistenciasByCurso(curso.id);
            
            if (asistenciasCurso.length === 0) {
              return (
                <div key={curso.id} className="historial-curso-card">
                  <div className="historial-curso-header">
                    <h3>{curso.nombre}</h3>
                    <span className="historial-curso-meta">{curso.turno} - {curso.horario}</span>
                  </div>
                  <div className="historial-empty-state">
                    <AlertCircle />
                    <p>No hay registros de asistencia para este curso en la fecha seleccionada</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={curso.id} className="historial-curso-card">
                <div className="historial-curso-header">
                  <h3>{curso.nombre}</h3>
                  <span className="historial-curso-meta">{curso.turno} - {curso.horario}</span>
                </div>
                
                <div className="historial-registros-list">
                  {asistenciasCurso.map(registro => (
                    <div 
                      key={registro.id} 
                      className={`historial-registro-item ${registro.presente ? 'presente' : 'ausente'}`}
                    >
                      <div className="historial-registro-alumno">
                        <div className="historial-registro-icon">
                          {registro.presente ? <CheckCircle /> : <XCircle />}
                        </div>
                        <div className="historial-registro-info">
                          <p className="alumno-name">
                            {registro.alumno_nombre}
                          </p>
                          <div className="alumno-meta">
                            <span>ID: {registro.alumno}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="historial-registro-details">
                        <div className="historial-registro-status">
                          <span className={`status-badge ${registro.presente ? 'presente' : 'ausente'}`}>
                            {registro.presente ? 'Presente' : 'Ausente'}
                          </span>
                          {registro.presente && (
                            <span className="hora-llegada">
                              <Clock size={14} />
                              {formatTime(registro.hora_llegada)}
                            </span>
                          )}
                        </div>
                        
                        <div className="historial-registro-maestro">
                          <span>Registrado por: {registro.maestro_nombre}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  const RetiroTab = () => (
    <div className="historial-retiros">
      <div className="historial-filters">
        <select
          value={selectedCurso || ''}
          onChange={(e) => setSelectedCurso(e.target.value ? parseInt(e.target.value) : null)}
          className="historial-filter-select"
        >
          <option value="">Todos los cursos</option>
          {/* CAMBIADO: Usar cursos con registros en lugar de solo "mis cursos" */}
          {getCursosConRegistros().map(curso => (
            <option key={curso.id} value={curso.id}>
              {curso.nombre} - {curso.turno}
            </option>
          ))}
        </select>
      </div>

      <div className="historial-registros">
        {/* CAMBIADO: Usar cursos con registros */}
        {getCursosConRegistros()
          .filter(curso => !selectedCurso || curso.id === selectedCurso)
          .map(curso => {
            const retirosCurso = getRetirosByCurso(curso.id);
            
            if (retirosCurso.length === 0) {
              return (
                <div key={curso.id} className="historial-curso-card">
                  <div className="historial-curso-header">
                    <h3>{curso.nombre}</h3>
                    <span className="historial-curso-meta">{curso.turno} - {curso.horario}</span>
                  </div>
                  <div className="historial-empty-state">
                    <AlertCircle />
                    <p>No hay registros de retiros para este curso en la fecha seleccionada</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={curso.id} className="historial-curso-card">
                <div className="historial-curso-header">
                  <h3>{curso.nombre}</h3>
                  <span className="historial-curso-meta">{curso.turno} - {curso.horario}</span>
                </div>
                
                <div className="historial-registros-list">
                  {retirosCurso.map(registro => (
                    <div key={registro.id} className="historial-registro-item retiro">
                      <div className="historial-registro-alumno">
                        <div className="historial-registro-icon">
                          <UserX />
                        </div>
                        <div className="historial-registro-info">
                          <p className="alumno-name">
                            {registro.alumno_nombre}
                          </p>
                          <div className="alumno-meta">
                            <span>ID: {registro.alumno}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="historial-registro-details">
                        <div className="historial-registro-status">
                          <span className="status-badge retiro">Retirado</span>
                          <span className="hora-retiro">
                            <Clock size={14} />
                            {formatTime(registro.hora_retiro)}
                          </span>
                        </div>
                        
                        <div className="historial-registro-familiar">
                          <span>
                            Retirado por: {registro.familiar_nombre}
                          </span>
                          <span className="relacion">({registro.relacion_con_alumno})</span>
                        </div>
                        
                        <div className="historial-registro-maestro">
                          <span>Autorizado por: {registro.maestro_nombre}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="historial-loading">
        <div className="spinner"></div>
        <p>Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="historial-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="historial-header">
          <div className="historial-header-content">
            <div className="historial-title-section">
              <button onClick={onBack} className="historial-back-button">
                <ArrowLeft />
              </button>
              <div className="historial-icon">
                <History />
              </div>
              <div className="historial-title-text">
                <h1>Historial de Asistencia</h1>
                <p>Consulta los registros de asistencia y retiros por fecha</p>
              </div>
            </div>
            
            <div className="historial-date-selector">
              <label htmlFor="fecha">Seleccionar fecha:</label>
              <input
                id="fecha"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="historial-date-input"
              />
            </div>
          </div>

          {/* Fecha seleccionada */}
          <div className="historial-selected-date">
            <Calendar />
            <span>{formatDate(selectedDate)}</span>
          </div>

          {/* Tabs */}
          <div className="historial-tabs">
            {[
              { key: 'resumen', label: 'Resumen', icon: Eye },
              { key: 'asistencia', label: 'Asistencia', icon: UserCheck },
              { key: 'retiro', label: 'Retiros', icon: UserX }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`historial-tab ${activeTab === key ? 'active' : ''}`}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="historial-error">
            <AlertCircle />
            <p>{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="historial-content">
          {activeTab === 'resumen' && <ResumenTab />}
          {activeTab === 'asistencia' && <AsistenciaTab />}
          {activeTab === 'retiro' && <RetiroTab />}
        </div>

        {/* Empty state */}
        {!loading && asistencias.length === 0 && retiros.length === 0 && (
          <div className="historial-empty-state-global">
            <div className="historial-empty-icon">
              <AlertCircle />
            </div>
            <h3>No hay registros para esta fecha</h3>
            <p>No se encontraron registros de asistencia ni retiros para el {formatDate(selectedDate)}.</p>
            <p>Selecciona otra fecha para ver los registros correspondientes.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialAsistenciaAlumnos;