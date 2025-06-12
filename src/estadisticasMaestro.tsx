import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, TrendingUp, BarChart3, Filter, Eye, ChevronDown, ChevronUp, ArrowLeft, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { userAPI, asistenciaAPI, handleAPIError } from './config/api';
import './estadisticasMaestro.css'; // Importar el CSS personalizado

// Tipos de datos
interface RegistroAsistencia {
  id: number;
  maestro: number;
  maestro_nombre: string;
  curso: number;
  curso_nombre: string;
  fecha: string;
  hora_ingreso: string | null;
  hora_salida: string | null;
  ausente?: boolean; // NUEVO CAMPO OPCIONAL (por compatibilidad)
}

interface EstadisticaMaestro {
  id: number;
  nombre: string;
  porcentajeAsistencia: number;
  diasTrabajados: number;
  diasTotales: number;
  diasAusentes: number; // NUEVO CAMPO
  horaIngresoPromedio: string;
  horasTrabajadasPromedio: number;
  cursos: string[];
  registros: RegistroAsistencia[];
}

interface FiltrosPeriodo {
  tipo: 'semana' | 'mes' | 'año';
  fecha: string;
  curso: string; // Nuevo filtro por curso
}

// Interface para las props del componente
interface EstadisticasMaestrosProps {
  user: any;
  onBack: () => void;
}

const EstadisticasMaestros: React.FC<EstadisticasMaestrosProps> = ({ user, onBack }) => {
  const [maestros, setMaestros] = useState<any[]>([]);
  const [registros, setRegistros] = useState<RegistroAsistencia[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticaMaestro[]>([]);
  const [cursosDisponibles, setCursosDisponibles] = useState<string[]>([]); // Lista de cursos disponibles
  const [filtros, setFiltros] = useState<FiltrosPeriodo>({
    tipo: 'mes',
    fecha: new Date().toISOString().split('T')[0],
    curso: 'todos' // Por defecto mostrar todos los cursos
  });
  const [maestroDetalle, setMaestroDetalle] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función mejorada para obtener datos usando la API configurada
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching data using API functions...');

      // Obtener maestros usando la API configurada
      const maestrosResponse = await userAPI.getAll();
      console.log('Maestros response:', maestrosResponse.data);
      
      // Filtrar solo maestros
      const maestrosData = maestrosResponse.data.filter((user: any) => user.es_maestro);
      console.log('Filtered maestros:', maestrosData);

      // Obtener registros de asistencia usando la API configurada
      const registrosResponse = await asistenciaAPI.getAll();
      console.log('Registros response:', registrosResponse.data);

      // Extraer cursos únicos de los registros
      const cursosUnicos: string[] = [...new Set(
        registrosResponse.data.map((r: RegistroAsistencia) => r.curso_nombre)
      )] as string[];
      setCursosDisponibles(cursosUnicos);

      setMaestros(maestrosData);
      setRegistros(registrosResponse.data);
    } catch (err: any) {
      console.error('Fetch error:', err);
      
      // Usar el manejador de errores de la API
      const apiError = handleAPIError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para debug - verificar la configuración actual
  const debugInfo = () => {
    console.log('Current user:', user);
    console.log('Token:', sessionStorage.getItem('auth_token'));
    console.log('Current URL:', window.location.href);
    console.log('API Base URL:', process.env.NODE_ENV === 'production' 
      ? 'https://sistema-de-gestion-de-jardines-back.onrender.com/api' 
      : 'http://localhost:8000/api');
  };

  // Calcular estadísticas
  const calcularEstadisticas = () => {
  const fechaFiltro = new Date(filtros.fecha);
  let fechaInicio: Date, fechaFin: Date;

  // Calcular rango de fechas según el filtro
  switch (filtros.tipo) {
    case 'semana':
      const diaSemana = fechaFiltro.getDay();
      fechaInicio = new Date(fechaFiltro);
      fechaInicio.setDate(fechaFiltro.getDate() - diaSemana);
      fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + 6);
      break;
    case 'mes':
      fechaInicio = new Date(fechaFiltro.getFullYear(), fechaFiltro.getMonth(), 1);
      fechaFin = new Date(fechaFiltro.getFullYear(), fechaFiltro.getMonth() + 1, 0);
      break;
    case 'año':
      fechaInicio = new Date(fechaFiltro.getFullYear(), 0, 1);
      fechaFin = new Date(fechaFiltro.getFullYear(), 11, 31);
      break;
    default:
      fechaInicio = new Date();
      fechaFin = new Date();
  }

  // Filtrar registros por período
  let registrosFiltrados = registros.filter(registro => {
    const fechaRegistro = new Date(registro.fecha);
    return fechaRegistro >= fechaInicio && fechaRegistro <= fechaFin;
  });

  // Filtrar por curso si se seleccionó uno específico
  if (filtros.curso !== 'todos') {
    registrosFiltrados = registrosFiltrados.filter(registro => 
      registro.curso_nombre === filtros.curso
    );
  }

  // Calcular días laborables en el período
  const diasLaborables = calcularDiasLaborables(fechaInicio, fechaFin);

  // Filtrar maestros que tienen registros en el curso seleccionado (si se filtró por curso)
  let maestrosFiltrados = maestros;
  if (filtros.curso !== 'todos') {
    const maestrosConRegistros = new Set(registrosFiltrados.map(r => r.maestro));
    maestrosFiltrados = maestros.filter(maestro => maestrosConRegistros.has(maestro.id));
  }

  // Calcular estadísticas por maestro
  const estadisticasCalculadas: EstadisticaMaestro[] = maestrosFiltrados.map(maestro => {
    const registrosMaestro = registrosFiltrados.filter(r => r.maestro === maestro.id);
    
    // CORRECCIÓN 1: Separar presencias y ausencias
    const registrosPresentes = registrosMaestro.filter(r => r.hora_ingreso && !r.ausente);
    const registrosAusentes = registrosMaestro.filter(r => r.ausente === true);
    
    // CORRECCIÓN 2: Días trabajados = solo los que tienen hora de ingreso y NO están marcados como ausentes
    const diasTrabajados = registrosPresentes.length;
    
    // CORRECCIÓN 3: Días totales = días con registro (presentes + ausentes) o días laborables si es mayor
    const diasConRegistro = registrosPresentes.length + registrosAusentes.length;
    let diasTotalesAjustados = Math.max(diasConRegistro, diasLaborables);
    
    // Si se filtró por curso específico, ajustar según los registros de ese curso
    if (filtros.curso !== 'todos') {
      // Solo contar los días que el maestro debería haber estado en este curso
      diasTotalesAjustados = Math.max(diasConRegistro, diasTrabajados);
    }
    
    // CORRECCIÓN 4: Porcentaje de asistencia considerando ausencias
    const porcentajeAsistencia = diasTotalesAjustados > 0 ? (diasTrabajados / diasTotalesAjustados) * 100 : 0;
    
    // Hora de ingreso promedio (solo de los días que asistió)
    const horasIngreso = registrosPresentes.map(r => {
      const [horas, minutos] = r.hora_ingreso!.split(':').map(Number);
      return horas + minutos / 60;
    });
    
    const horaIngresoPromedio = horasIngreso.length > 0 
      ? horasIngreso.reduce((a, b) => a + b, 0) / horasIngreso.length 
      : 0;
    
    // Horas trabajadas promedio (solo de días completos)
    const horasTrabajadasDiarias = registrosPresentes
      .filter(r => r.hora_salida)
      .map(r => {
        const ingreso = timeToMinutes(r.hora_ingreso!);
        const salida = timeToMinutes(r.hora_salida!);
        return (salida - ingreso) / 60; // Convertir a horas
      });
    
    const horasTrabajadasPromedio = horasTrabajadasDiarias.length > 0
      ? horasTrabajadasDiarias.reduce((a, b) => a + b, 0) / horasTrabajadasDiarias.length
      : 0;

    // Cursos únicos (filtrados si corresponde)
    const cursosUnicos = [...new Set(registrosMaestro.map(r => r.curso_nombre))];

    return {
      id: maestro.id,
      nombre: `${maestro.first_name} ${maestro.last_name}`,
      porcentajeAsistencia: Math.round(porcentajeAsistencia * 100) / 100,
      diasTrabajados,
      diasTotales: diasTotalesAjustados,
      diasAusentes: registrosAusentes.length, // NUEVO: agregar días ausentes
      horaIngresoPromedio: formatearHora(horaIngresoPromedio),
      horasTrabajadasPromedio: Math.round(horasTrabajadasPromedio * 100) / 100,
      cursos: cursosUnicos,
      registros: registrosMaestro
    };
  });

  setEstadisticas(estadisticasCalculadas);
};

  // Funciones auxiliares
  const calcularDiasLaborables = (inicio: Date, fin: Date): number => {
    let count = 0;
    const current = new Date(inicio);
    
    while (current <= fin) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No domingo ni sábado
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  const timeToMinutes = (timeString: string): number => {
    const [horas, minutos] = timeString.split(':').map(Number);
    return horas * 60 + minutos;
  };

  const formatearHora = (horaDecimal: number): string => {
    const horas = Math.floor(horaDecimal);
    const minutos = Math.round((horaDecimal - horas) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };

  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  // Datos para gráficos
  const datosGrafico = estadisticas.map(est => ({
    nombre: est.nombre.split(' ')[0], // Solo primer nombre para el gráfico
    asistencia: est.porcentajeAsistencia,
    horaIngreso: parseFloat(est.horaIngresoPromedio.replace(':', '.'))
  }));

  // Effects
  useEffect(() => {
    debugInfo();
    fetchData();
  }, []);

  useEffect(() => {
    if (maestros.length > 0 && registros.length > 0) {
      calcularEstadisticas();
    }
  }, [maestros, registros, filtros]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h3 className="estadisticas-subtitle">Cargando estadísticas...</h3>
          
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">
            <BarChart3 size={48} />
          </div>
          <h3 className="error-title">Error al cargar datos</h3>
          <p className="error-message">{error}</p>
          <div>
            <button 
              onClick={fetchData}
              className="action-button"
            >
              Reintentar
            </button>
            <button 
              onClick={debugInfo}
              className="action-button secondary"
            >
              Ver información de debug
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="estadisticas-container">
      <div className="estadisticas-content">
        {/* Header con botón de volver */}
        <div className="estadisticas-header">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Volver
          </button>
          <h1 className="estadisticas-title">
            Estadísticas de Asistencia
          </h1>
          <p className="estadisticas-subtitle">
            Análisis detallado de la asistencia de maestros por período
            {filtros.curso !== 'todos' && (
              <span> - Curso: <strong>{filtros.curso}</strong></span>
            )}
          </p>
        </div>

        {/* Filtros */}
        <div className="filtros-section">
          <div className="filtros-content">
            <div className="filtros-label">
              <Filter size={20} />
              <span>Filtros:</span>
            </div>
            
            <div className="filtro-group">
              <label>Período:</label>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value as any }))}
                className="filtro-select"
              >
                <option value="semana">Semana</option>
                <option value="mes">Mes</option>
                <option value="año">Año</option>
              </select>
            </div>

            <div className="filtro-group">
              <label>Fecha:</label>
              <input
                type="date"
                value={filtros.fecha}
                onChange={(e) => setFiltros(prev => ({ ...prev, fecha: e.target.value }))}
                className="filtro-input"
              />
            </div>

            {/* Nuevo filtro por curso */}
            <div className="filtro-group">
              <label>
                <BookOpen size={16} />
                Curso:
              </label>
              <select
                value={filtros.curso}
                onChange={(e) => setFiltros(prev => ({ ...prev, curso: e.target.value }))}
                className="filtro-select"
              >
                <option value="todos">Todos los cursos</option>
                {cursosDisponibles.map(curso => (
                  <option key={curso} value={curso}>
                    {curso}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resumen General */}
        <div className="resumen-grid">
          <div className="resumen-card">
            <div className="resumen-content">
              <div className="resumen-icon users">
                <Users size={32} />
              </div>
              <div className="resumen-info">
                <h3>
                  {filtros.curso !== 'todos' ? 'Maestros en Curso' : 'Total Maestros'}
                </h3>
                <p>{estadisticas.length}</p>
              </div>
            </div>
          </div>

          <div className="resumen-card">
            <div className="resumen-content">
              <div className="resumen-icon trending">
                <TrendingUp size={32} />
              </div>
              <div className="resumen-info">
                <h3>Asistencia Promedio</h3>
                <p>
                  {estadisticas.length > 0 
                    ? Math.round(estadisticas.reduce((acc, est) => acc + est.porcentajeAsistencia, 0) / estadisticas.length)
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="resumen-card">
            <div className="resumen-content">
              <div className="resumen-icon clock">
                <Clock size={32} />
              </div>
              <div className="resumen-info">
                <h3>Hora Ingreso Promedio</h3>
                <p>
                  {estadisticas.length > 0
                    ? formatearHora(estadisticas.reduce((acc, est) => {
                        const [h, m] = est.horaIngresoPromedio.split(':').map(Number);
                        return acc + h + m/60;
                      }, 0) / estadisticas.length)
                    : '00:00'}
                </p>
              </div>
            </div>
          </div>

          <div className="resumen-card">
            <div className="resumen-content">
              <div className="resumen-icon calendar">
                <Calendar size={32} />
              </div>
              <div className="resumen-info">
                <h3>
                  {filtros.curso !== 'todos' ? 'Días de Curso' : 'Días Laborables'}
                </h3>
                <p>
                  {estadisticas.length > 0 ? estadisticas[0].diasTotales : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="graficos-grid">
          <div className="grafico-card">
            <h3 className="grafico-title">
              Porcentaje de Asistencia por Maestro
              {filtros.curso !== 'todos' && (
                <span className="grafico-subtitle"> - {filtros.curso}</span>
              )}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Asistencia']} />
                <Bar dataKey="asistencia" fill="var(--primary-purple)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grafico-card">
            <h3 className="grafico-title">
              Tendencia de Asistencia
              {filtros.curso !== 'todos' && (
                <span className="grafico-subtitle"> - {filtros.curso}</span>
              )}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Asistencia']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="asistencia" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla Detallada */}
        <div className="tabla-container">
          <div className="tabla-header">
            <h3>
              Detalle por Maestro
              {filtros.curso !== 'todos' && (
                <span> - {filtros.curso}</span>
              )}
            </h3>
          </div>
          
          <div className="tabla-scroll">
            <table className="tabla-maestros">
              <thead>
                <tr>
                  <th>Maestro</th>
                  <th>Asistencia</th>
                  <th>Días Trabajados</th>
                  <th>Días Ausentes</th> {/* NUEVA COLUMNA */}
                  <th>Hora Promedio</th>
                  <th>Horas Diarias</th>
                  <th>Cursos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {estadisticas.map((maestro) => (
                  <React.Fragment key={maestro.id}>
                    <tr>
                      <td>
                        <strong>{maestro.nombre}</strong>
                      </td>
                      <td>
                        <div className="progress-container">
                          <span>{maestro.porcentajeAsistencia}%</span>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${Math.min(maestro.porcentajeAsistencia, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {maestro.diasTrabajados} / {maestro.diasTotales}
                      </td>
                      <td>
                        {maestro.horaIngresoPromedio}
                      </td>
                      <td>
                        {maestro.horasTrabajadasPromedio.toFixed(1)}h
                      </td>
                      <td>
                        <span className="estado-ausente">{maestro.diasAusentes}</span>
                      </td>
                      <td>
                        {maestro.cursos.length > 2 
                          ? `${maestro.cursos.slice(0, 2).join(', ')} +${maestro.cursos.length - 2}`
                          : maestro.cursos.join(', ')
                        }
                      </td>
                      <td>
                        <button
                          onClick={() => setMaestroDetalle(
                            maestroDetalle === maestro.id ? null : maestro.id
                          )}
                          className="detalle-button"
                        >
                          <Eye size={16} />
                          Ver detalle
                          {maestroDetalle === maestro.id ? 
                            <ChevronUp size={16} /> : 
                            <ChevronDown size={16} />
                          }
                        </button>
                      </td>
                    </tr>
                    
                    {/* Fila expandible con detalle */}
                    {maestroDetalle === maestro.id && (
                      <tr className="detalle-row">
                        <td colSpan={7}>
                          <div className="detalle-content">
                            <h4 className="detalle-title">
                              Registros detallados - {maestro.nombre}
                              {filtros.curso !== 'todos' && (
                                <span> - {filtros.curso}</span>
                              )}
                            </h4>
                            
                            {maestro.registros.length > 0 ? (
                              <table className="detalle-table">
                                <thead>
                                  <tr>
                                    <th>Fecha</th>
                                    <th>Curso</th>
                                    <th>Ingreso</th>
                                    <th>Salida</th>
                                    <th>Horas</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {maestro.registros.map((registro) => (
                                    <tr key={registro.id}>
                                      <td>{formatearFecha(registro.fecha)}</td>
                                      <td>{registro.curso_nombre}</td>
                                      <td>
                                        {registro.ausente ? (
                                          <span className="estado-ausente">AUSENTE</span>
                                        ) : registro.hora_ingreso ? (
                                          <span className="estado-presente">{registro.hora_ingreso}</span>
                                        ) : (
                                          <span className="estado-indefinido">No registrado</span>
                                        )}
                                      </td>
                                      <td>
                                        {registro.ausente ? (
                                          <span className="estado-ausente">AUSENTE</span>
                                        ) : registro.hora_salida ? (
                                          <span className="estado-presente">{registro.hora_salida}</span>
                                        ) : (
                                          <span className="estado-indefinido">--</span>
                                        )}
                                      </td>
                                      <td>
                                        {registro.ausente ? (
                                          <span className="estado-ausente">0h</span>
                                        ) : registro.hora_ingreso && registro.hora_salida ? (
                                          <span>
                                            {(
                                              (timeToMinutes(registro.hora_salida) - timeToMinutes(registro.hora_ingreso)) / 60
                                            ).toFixed(1)}h
                                          </span>
                                        ) : (
                                          <span className="estado-indefinido">--</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="estado-indefinido">
                                No hay registros para este período
                                {filtros.curso !== 'todos' && ` en el curso ${filtros.curso}`}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstadisticasMaestros;