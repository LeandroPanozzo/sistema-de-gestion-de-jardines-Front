import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, Users, TrendingUp, BookOpen, Clock, User, Filter, ArrowLeft } from 'lucide-react';
import { asistenciaAlumnoAPI, cursoAPI, alumnoAPI, UserData } from './config/api';
import './EstadisticasAlumno.css'; // Importar el CSS personalizado

// Props interface for the component
interface EstadisticasAlumnoProps {
  user: UserData;
  onBack: () => void;
}

// TypeScript interfaces
interface Curso {
  id: number;
  nombre: string;
  turno: string;
  descripcion?: string;
  grado?: string;
  division?: string;
}

interface Alumno {
  id: number;
  nombre: string;
  apellido: string;
  curso_id?: number;
  curso_nombre?: string;
  dni?: string;
  fecha_nacimiento?: string;
}

interface AsistenciaAlumno {
  id: number;
  alumno: number;
  alumno_nombre?: string;
  curso: number;
  curso_nombre?: string;
  fecha: string;
  presente: boolean;
  observaciones?: string;
  created_at?: string;
  hora_llegada?: string;
}

interface EstadisticasGenerales {
  totalRegistros: number;
  totalPresentes: number;
  totalAusentes: number;
  porcentajeAsistencia: number;
}

interface EstadisticasCurso {
  id: number;
  nombre: string;
  turno: string;
  totalRegistros: number;
  presentes: number;
  ausentes: number;
  porcentajeAsistencia: number;
}

interface EstadisticasAlumno {
  id: number;
  nombre: string;
  curso: string;
  totalRegistros: number;
  presentes: number;
  ausentes: number;
  porcentajeAsistencia: number;
}

interface TendenciaTemporal {
  fecha: string;
  total: number;
  presentes: number;
  porcentaje: number;
}

interface Filtros {
  periodo: 'semana' | 'mes' | 'año';
  curso: string;
  alumno: string;
}

const EstadisticasAlumnoComponent: React.FC<EstadisticasAlumnoProps> = ({ user, onBack }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    periodo: 'mes',
    curso: '',
    alumno: ''
  });
  
  // Estados para los datos
  const [registrosAsistencia, setRegistrosAsistencia] = useState<AsistenciaAlumno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState<EstadisticasGenerales>({
    totalRegistros: 0,
    totalPresentes: 0,
    totalAusentes: 0,
    porcentajeAsistencia: 0
  });
  const [estadisticasPorCurso, setEstadisticasPorCurso] = useState<EstadisticasCurso[]>([]);
  const [estadisticasPorAlumno, setEstadisticasPorAlumno] = useState<EstadisticasAlumno[]>([]);
  const [tendenciaTemporal, setTendenciaTemporal] = useState<TendenciaTemporal[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('Cargando datos...');

      // Cargar datos base
      const [cursosRes, alumnosRes, asistenciaRes] = await Promise.all([
        cursoAPI.getAll(),
        alumnoAPI.getAll(),
        asistenciaAlumnoAPI.getAll()
      ]);

      const cursosData: Curso[] = cursosRes.data;
      const alumnosData: Alumno[] = alumnosRes.data;
      const asistenciaData: AsistenciaAlumno[] = asistenciaRes.data;

      console.log('Datos cargados:', {
        cursos: cursosData.length,
        alumnos: alumnosData.length,
        asistencia: asistenciaData.length
      });

      setCursos(cursosData);
      setAlumnos(alumnosData);
      
      // Filtrar registros según período y filtros
      let registrosFiltrados: AsistenciaAlumno[] = asistenciaData;
      
      console.log('Aplicando filtros:', filtros);
      
      // Aplicar filtros
      if (filtros.curso) {
        registrosFiltrados = registrosFiltrados.filter((r: AsistenciaAlumno) => 
          r.curso === parseInt(filtros.curso)
        );
        console.log(`Después de filtrar por curso ${filtros.curso}:`, registrosFiltrados.length);
      }
      
      if (filtros.alumno) {
        registrosFiltrados = registrosFiltrados.filter((r: AsistenciaAlumno) => 
          r.alumno === parseInt(filtros.alumno)
        );
        console.log(`Después de filtrar por alumno ${filtros.alumno}:`, registrosFiltrados.length);
      }

      // Filtrar por período
      const fechaLimite = obtenerFechaLimite(filtros.periodo);
      const registrosFiltradosPorFecha = registrosFiltrados.filter((r: AsistenciaAlumno) => {
        const fechaRegistro = new Date(r.fecha);
        return fechaRegistro >= fechaLimite;
      });
      
      console.log(`Después de filtrar por período ${filtros.periodo}:`, registrosFiltradosPorFecha.length);
      console.log('Fecha límite:', fechaLimite);

      setRegistrosAsistencia(registrosFiltradosPorFecha);
      
      // Calcular estadísticas
      calcularEstadisticas(registrosFiltradosPorFecha, cursosData, alumnosData);
      
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar las estadísticas de asistencia');
    } finally {
      setLoading(false);
    }
  };

  const obtenerFechaLimite = (periodo: 'semana' | 'mes' | 'año'): Date => {
    const hoy = new Date();
    switch (periodo) {
      case 'semana':
        return new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'mes':
        return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      case 'año':
        return new Date(hoy.getFullYear(), 0, 1);
      default:
        return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }
  };

  const calcularEstadisticas = (
    registros: AsistenciaAlumno[], 
    cursosData: Curso[], 
    alumnosData: Alumno[]
  ): void => {
    console.log('Calculando estadísticas con', registros.length, 'registros');
    
    // Estadísticas generales
    const totalRegistros = registros.length;
    const totalPresentes = registros.filter((r: AsistenciaAlumno) => r.presente).length;
    const totalAusentes = totalRegistros - totalPresentes;
    const porcentajeAsistencia = totalRegistros > 0 ? 
      parseFloat(((totalPresentes / totalRegistros) * 100).toFixed(1)) : 0;

    console.log('Estadísticas generales:', {
      totalRegistros,
      totalPresentes,
      totalAusentes,
      porcentajeAsistencia
    });

    setEstadisticasGenerales({
      totalRegistros,
      totalPresentes,
      totalAusentes,
      porcentajeAsistencia
    });

    // Estadísticas por curso
    const cursoStats: EstadisticasCurso[] = cursosData.map((curso: Curso) => {
      const registrosCurso = registros.filter((r: AsistenciaAlumno) => r.curso === curso.id);
      const presentesCurso = registrosCurso.filter((r: AsistenciaAlumno) => r.presente).length;
      const totalCurso = registrosCurso.length;
      const porcentajeCurso = totalCurso > 0 ? 
        parseFloat(((presentesCurso / totalCurso) * 100).toFixed(1)) : 0;

      return {
        id: curso.id,
        nombre: curso.nombre,
        turno: curso.turno,
        totalRegistros: totalCurso,
        presentes: presentesCurso,
        ausentes: totalCurso - presentesCurso,
        porcentajeAsistencia: porcentajeCurso
      };
    }).filter((curso: EstadisticasCurso) => curso.totalRegistros > 0);

    console.log('Estadísticas por curso:', cursoStats);
    setEstadisticasPorCurso(cursoStats);

    // Estadísticas por alumno
    const alumnoStats: EstadisticasAlumno[] = alumnosData.map((alumno: Alumno) => {
      const registrosAlumno = registros.filter((r: AsistenciaAlumno) => r.alumno === alumno.id);
      const presentesAlumno = registrosAlumno.filter((r: AsistenciaAlumno) => r.presente).length;
      const totalAlumno = registrosAlumno.length;
      const porcentajeAlumno = totalAlumno > 0 ? 
        parseFloat(((presentesAlumno / totalAlumno) * 100).toFixed(1)) : 0;

      return {
        id: alumno.id,
        nombre: `${alumno.nombre} ${alumno.apellido}`,
        curso: alumno.curso_nombre || '',
        totalRegistros: totalAlumno,
        presentes: presentesAlumno,
        ausentes: totalAlumno - presentesAlumno,
        porcentajeAsistencia: porcentajeAlumno
      };
    }).filter((alumno: EstadisticasAlumno) => alumno.totalRegistros > 0);

    console.log('Estadísticas por alumno:', alumnoStats);
    setEstadisticasPorAlumno(alumnoStats);

    // Tendencia temporal
    calcularTendenciaTemporal(registros);
  };

  const calcularTendenciaTemporal = (registros: AsistenciaAlumno[]): void => {
    const registrosPorFecha: Record<string, { fecha: string; total: number; presentes: number }> = {};
    
    registros.forEach((registro: AsistenciaAlumno) => {
      const fecha = registro.fecha;
      if (!registrosPorFecha[fecha]) {
        registrosPorFecha[fecha] = { fecha, total: 0, presentes: 0 };
      }
      registrosPorFecha[fecha].total++;
      if (registro.presente) {
        registrosPorFecha[fecha].presentes++;
      }
    });

    const tendencia: TendenciaTemporal[] = Object.values(registrosPorFecha)
      .map(item => ({
        fecha: item.fecha,
        total: item.total,
        presentes: item.presentes,
        porcentaje: item.total > 0 ? 
          parseFloat(((item.presentes / item.total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    console.log('Tendencia temporal:', tendencia);
    setTendenciaTemporal(tendencia);
  };

  const handleFiltroChange = (campo: keyof Filtros, valor: string): void => {
    console.log(`Cambiando filtro ${campo} a:`, valor);
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const getAttendancePercentageClass = (percentage: number): string => {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 70) return 'good';
    return 'poor';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <p className="error-title">Error</p>
          <p className="error-text">{error}</p>
          <button 
            onClick={cargarDatos}
            className="retry-button"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="estadisticas-container">
      <div className="estadisticas-content">
        {/* Header with back button */}
        <div className="estadisticas-header">
          <div className="header-actions">
            <button onClick={onBack} className="back-button">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <div className="user-info">
              <User className="h-4 w-4" />
              Usuario: {user.first_name} {user.last_name}
            </div>
          </div>
          
          <h1 className="estadisticas-title">
            Estadísticas de Asistencia
          </h1>
          <p className="estadisticas-subtitle">
            Análisis detallado de la asistencia de alumnos
          </p>
        </div>

        {/* Debug info */}
        <div className="debug-info">
          <h3 className="debug-title">
            <TrendingUp className="h-5 w-5" />
            Información de Debug:
          </h3>
          <div className="debug-grid">
            <div>Cursos: {cursos.length}</div>
            <div>Alumnos: {alumnos.length}</div>
            <div>Registros: {registrosAsistencia.length}</div>
            <div>Período: {filtros.periodo}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="filtros-section">
          <div className="filtros-header">
            <Filter className="h-5 w-5" />
            <h2>Filtros</h2>
          </div>
          
          <div className="filtros-grid">
            <div className="filtro-group">
              <label className="filtro-label">Período</label>
              <select
                value={filtros.periodo}
                onChange={(e) => handleFiltroChange('periodo', e.target.value)}
                className="filtro-select"
              >
                <option value="semana">Última semana</option>
                <option value="mes">Este mes</option>
                <option value="año">Este año</option>
              </select>
            </div>

            <div className="filtro-group">
              <label className="filtro-label">Curso</label>
              <select
                value={filtros.curso}
                onChange={(e) => handleFiltroChange('curso', e.target.value)}
                className="filtro-select"
              >
                <option value="">Todos los cursos</option>
                {cursos.map((curso: Curso) => (
                  <option key={curso.id} value={curso.id.toString()}>
                    {curso.nombre} - {curso.turno}
                  </option>
                ))}
              </select>
            </div>

            <div className="filtro-group">
              <label className="filtro-label">Alumno</label>
              <select
                value={filtros.alumno}
                onChange={(e) => handleFiltroChange('alumno', e.target.value)}
                className="filtro-select"
              >
                <option value="">Todos los alumnos</option>
                {alumnos.map((alumno: Alumno) => (
                  <option key={alumno.id} value={alumno.id.toString()}>
                    {alumno.nombre} {alumno.apellido}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Estadísticas generales */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-info">
                <h3>Total Registros</h3>
                <div className="stat-value">
                  {estadisticasGenerales.totalRegistros}
                </div>
              </div>
              <div className="stat-icon">
                <Calendar />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-info">
                <h3>Presentes</h3>
                <div className="stat-value green">
                  {estadisticasGenerales.totalPresentes}
                </div>
              </div>
              <div className="stat-icon green">
                <Users />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-info">
                <h3>Ausentes</h3>
                <div className="stat-value red">
                  {estadisticasGenerales.totalAusentes}
                </div>
              </div>
              <div className="stat-icon red">
                <Clock />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div className="stat-info">
                <h3>% Asistencia</h3>
                <div className="stat-value blue">
                  {estadisticasGenerales.porcentajeAsistencia}%
                </div>
              </div>
              <div className="stat-icon">
                <TrendingUp />
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje si no hay datos */}
        {registrosAsistencia.length === 0 && (
          <div className="no-data-message">
            <p className="no-data-title">No hay datos disponibles</p>
            <p className="no-data-text">
              No se encontraron registros de asistencia para los filtros seleccionados.
            </p>
          </div>
        )}

        {/* Gráfico de tendencia temporal */}
        {tendenciaTemporal.length > 0 && (
          <div className="chart-section">
            <div className="section-header">
              <h3 className="section-title">Tendencia de Asistencia</h3>
              <TrendingUp className="section-icon" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={tendenciaTemporal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="fecha" 
                  tickFormatter={formatearFecha}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={formatearFecha}
                  formatter={(value: any, name: string) => [
                    name === 'porcentaje' ? `${value}%` : value,
                    name === 'porcentaje' ? 'Porcentaje' : 
                    name === 'presentes' ? 'Presentes' : 'Total'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="porcentaje" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="porcentaje"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Estadísticas por curso */}
        {estadisticasPorCurso.length > 0 && (
          <div className="chart-section">
            <div className="section-header">
              <h3 className="section-title">Asistencia por Curso</h3>
              <BookOpen className="section-icon" />
            </div>
            
            <div className="curso-grid">
              {/* Gráfico de barras */}
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={estadisticasPorCurso}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="porcentajeAsistencia" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Lista detallada */}
              <div className="curso-details">
                {estadisticasPorCurso.map((curso: EstadisticasCurso) => (
                  <div key={curso.id} className="curso-card">
                    <div className="curso-header">
                      <div className="curso-info">
                        <h4>{curso.nombre}</h4>
                        <p className="curso-turno">Turno: {curso.turno}</p>
                      </div>
                      <span className="curso-percentage">
                        {curso.porcentajeAsistencia}%
                      </span>
                    </div>
                    <div className="curso-stats">
                      <span>Presentes: {curso.presentes}</span>
                      <span>Ausentes: {curso.ausentes}</span>
                      <span>Total: {curso.totalRegistros}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${curso.porcentajeAsistencia}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas por alumno */}
        {estadisticasPorAlumno.length > 0 && (
          <div className="data-section">
            <div className="section-header">
              <h3 className="section-title">Asistencia por Alumno</h3>
              <User className="section-icon" />
            </div>

            <div className="table-container">
              <table className="stats-table">
                <thead className="table-header">
                  <tr>
                    <th>Alumno</th>
                    <th>Curso</th>
                    <th>Presentes</th>
                    <th>Ausentes</th>
                    <th>Total</th>
                    <th>% Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {estadisticasPorAlumno.map((alumno: EstadisticasAlumno) => (
                    <tr key={alumno.id} className="table-row">
                      <td className="table-cell">
                        <div className="student-name">
                          {alumno.nombre}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="course-name">
                          {alumno.curso || 'Sin curso'}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="attendance-present">
                          {alumno.presentes}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="attendance-absent">
                          {alumno.ausentes}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="attendance-total">
                          {alumno.totalRegistros}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="attendance-percentage">
                          <span className={`percentage-text ${getAttendancePercentageClass(alumno.porcentajeAsistencia)}`}>
                            {alumno.porcentajeAsistencia}%
                          </span>
                          <div className="mini-progress">
                            <div 
                              className={`mini-progress-fill ${getAttendancePercentageClass(alumno.porcentajeAsistencia)}`}
                              style={{ width: `${alumno.porcentajeAsistencia}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstadisticasAlumnoComponent;