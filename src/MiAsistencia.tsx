import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Calendar, User, ArrowLeft, Bell, AlertTriangle } from 'lucide-react';
import { cursoAPI, asistenciaAPI, handleAPIError, UserData } from './config/api';
import './MiAsistencia.css';

interface Curso {
  id: number;
  nombre: string;
  turno: string;
  horario: string;
  edad_sala: number;
}

interface RegistroAsistencia {
  id: number;
  fecha: string;
  curso: number;
  curso_nombre: string;
  hora_ingreso: string | null;
  hora_salida: string | null;
}

interface EstadoRegistro {
  registro_habilitado: boolean;
  message: string;
}

interface MiAsistenciaProps {
  user: UserData;
  onBack: () => void;
}

const MiAsistencia: React.FC<MiAsistenciaProps> = ({ onBack }) => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [registros, setRegistros] = useState<RegistroAsistencia[]>([]);
  const [estadoRegistro, setEstadoRegistro] = useState<EstadoRegistro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar cursos asignados
      const cursosResponse = await cursoAPI.misCursos();
      setCursos(cursosResponse.data);

      // Cargar registros de asistencia del día
      const registrosResponse = await asistenciaAPI.misRegistrosHoy();
      setRegistros(registrosResponse.data);

      // Verificar estado del registro
      const estadoResponse = await asistenciaAPI.estadoRegistro();
      setEstadoRegistro(estadoResponse.data);

    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const obtenerHorarioLimites = (horario: string) => {
    // Extraer hora de inicio del horario (ej: "8:00 - 12:00" -> "8:00")
    const horaInicio = horario.split(' - ')[0];
    const horaFin = horario.split(' - ')[1];
    
    // Convertir a objeto Date para calcular límites
    const [horaInicioHour, horaInicioMin] = horaInicio.split(':').map(Number);
    const [horaFinHour, horaFinMin] = horaFin.split(':').map(Number);
    
    // Una hora antes del inicio
    let limiteIngresoInicio = new Date();
    limiteIngresoInicio.setHours(horaInicioHour - 1, horaInicioMin, 0, 0);
    
    // Una hora después del inicio
    let limiteIngresoFin = new Date();
    limiteIngresoFin.setHours(horaInicioHour + 1, horaInicioMin, 0, 0);
    
    // Una hora antes del fin
    let limiteEgresoInicio = new Date();
    limiteEgresoInicio.setHours(horaFinHour - 1, horaFinMin, 0, 0);
    
    // Una hora después del fin
    let limiteEgresoFin = new Date();
    limiteEgresoFin.setHours(horaFinHour + 1, horaFinMin, 0, 0);

    return {
      limiteIngresoInicio,
      limiteIngresoFin,
      limiteEgresoInicio,
      limiteEgresoFin,
      horaInicio: `${horaInicioHour.toString().padStart(2, '0')}:${horaInicioMin.toString().padStart(2, '0')}`,
      horaFin: `${horaFinHour.toString().padStart(2, '0')}:${horaFinMin.toString().padStart(2, '0')}`
    };
  };

  const puedeRegistrarIngreso = (horario: string): boolean => {
    const ahora = new Date();
    const { limiteIngresoInicio, limiteIngresoFin } = obtenerHorarioLimites(horario);
    return ahora >= limiteIngresoInicio && ahora <= limiteIngresoFin;
  };

  const puedeRegistrarEgreso = (horario: string): boolean => {
    const ahora = new Date();
    const { limiteEgresoInicio, limiteEgresoFin } = obtenerHorarioLimites(horario);
    return ahora >= limiteEgresoInicio && ahora <= limiteEgresoFin;
  };

  // Función para obtener el registro de un curso específico para hoy
  const obtenerRegistroCurso = (cursoId: number): RegistroAsistencia | null => {
    return registros.find(registro => registro.curso === cursoId) || null;
  };

  const registrarIngreso = async (cursoId: number) => {
    if (!estadoRegistro?.registro_habilitado) {
      setError('El registro de asistencia está deshabilitado');
      return;
    }

    try {
      setProcesando({ ...procesando, [`ingreso_${cursoId}`]: true });
      
      const ahora = new Date();
      const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}:00`;
      
      console.log('Enviando datos de ingreso:', { curso_id: cursoId, hora_ingreso: horaActual });
      
      await asistenciaAPI.registrarIngreso(cursoId, horaActual);
      
      // Recargar registros
      await cargarDatos();
      
      // Limpiar cualquier error previo
      setError(null);
      
    } catch (err: any) {
      console.error('Error detallado:', err);
      console.error('Response data:', err.response?.data);
      console.error('Response status:', err.response?.status);
      
      const apiError = handleAPIError(err);
      
      // Si hay errores específicos de validación, mostrarlos
      if (apiError.type === 'validation' && apiError.errors) {
        const errorMessages = Object.entries(apiError.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        setError(`Errores de validación: ${errorMessages}`);
      } else {
        setError(apiError.message);
      }
    } finally {
      setProcesando({ ...procesando, [`ingreso_${cursoId}`]: false });
    }
  };

  const registrarSalida = async (cursoId: number) => {
    if (!estadoRegistro?.registro_habilitado) {
      setError('El registro de asistencia está deshabilitado');
      return;
    }

    try {
      setProcesando({ ...procesando, [`salida_${cursoId}`]: true });
      
      const ahora = new Date();
      const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}:00`;
      
      console.log('Enviando datos de salida:', { curso_id: cursoId, hora_salida: horaActual });
      
      await asistenciaAPI.registrarSalida(cursoId, horaActual);
      
      // Recargar registros
      await cargarDatos();
      
      // Limpiar cualquier error previo
      setError(null);
      
    } catch (err: any) {
      console.error('Error detallado en salida:', err);
      console.error('Response data:', err.response?.data);
      console.error('Response status:', err.response?.status);
      
      const apiError = handleAPIError(err);
      
      // Si hay errores específicos de validación, mostrarlos
      if (apiError.type === 'validation' && apiError.errors) {
        const errorMessages = Object.entries(apiError.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        setError(`Errores de validación: ${errorMessages}`);
      } else {
        setError(apiError.message);
      }
    } finally {
      setProcesando({ ...procesando, [`salida_${cursoId}`]: false });
    }
  };

  // NUEVAS FUNCIONES PARA AVISAR AL DIRECTIVO
  const avisarDirectivoIngreso = async (cursoId: number) => {
    try {
      setProcesando({ ...procesando, [`aviso_ingreso_${cursoId}`]: true });
      
      const response = await asistenciaAPI.avisarDirectivoIngreso(cursoId);
      
      // Mostrar mensaje de éxito con más información
      if (response.data.message) {
        // El mensaje del backend ahora incluye la hora
        alert(`✅ ${response.data.message}`);
      }
      
      setError(null);
      
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
    } finally {
      setProcesando({ ...procesando, [`aviso_ingreso_${cursoId}`]: false });
    }
  };

  const avisarDirectivoSalida = async (cursoId: number) => {
    try {
      setProcesando({ ...procesando, [`aviso_salida_${cursoId}`]: true });
      
      const response = await asistenciaAPI.avisarDirectivoSalida(cursoId);
      
      // Mostrar mensaje de éxito con más información
      if (response.data.message) {
        // El mensaje del backend ahora incluye la hora
        alert(`✅ ${response.data.message}`);
      }
      
      setError(null);
      
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
    } finally {
      setProcesando({ ...procesando, [`aviso_salida_${cursoId}`]: false });
    }
  };

  const formatearHora = (hora: string): string => {
    return hora.substring(0, 5); // HH:MM
  };

  if (loading) {
    return (
      <div className="mi-asistencia-container">
        <div className="loading-spinner">
          <Clock className="animate-spin" size={48} />
        </div>
      </div>
    );
  }

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="mi-asistencia-container">
      {/* Header */}
      <header className="mi-asistencia-header">
        <button 
          onClick={onBack}
          className="back-button"
        >
          <ArrowLeft size={20} />
          Volver
        </button>
        <h1>Mi Asistencia</h1>
      </header>

      {/* Estado del sistema */}
      {estadoRegistro && (
        <div className={`sistema-estado ${estadoRegistro.registro_habilitado ? 'habilitado' : 'deshabilitado'}`}>
          <div className="estado-icon">
            {estadoRegistro.registro_habilitado ? 
              <CheckCircle size={20} /> : 
              <XCircle size={20} />
            }
          </div>
          <span>{estadoRegistro.message}</span>
        </div>
      )}

      {/* Fecha actual */}
      <div className="fecha-actual">
        <Calendar size={20} />
        <span>{fechaHoy}</span>
      </div>

      {/* Error */}
      {error && (
        <div className="error-message">
          <XCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Cursos asignados con asistencia individual */}
      <div className="cursos-section">
        <h2>Mis Cursos - Asistencia por Curso</h2>
        
        {cursos.length === 0 ? (
          <div className="no-cursos">
            <User size={48} />
            <p>No tienes cursos asignados actualmente</p>
          </div>
        ) : (
          <div className="cursos-grid">
            {cursos.map((curso) => {
              const horarioLimites = obtenerHorarioLimites(curso.horario);
              const puedeIngreso = puedeRegistrarIngreso(curso.horario);
              const puedeEgreso = puedeRegistrarEgreso(curso.horario);
              const registroCurso = obtenerRegistroCurso(curso.id);
              
              return (
                <div key={curso.id} className="curso-card">
                  <div className="curso-info">
                    <h3>{curso.nombre}</h3>
                    <div className="curso-detalles">
                      <span className="turno">{curso.turno}</span>
                      <span className="horario">{curso.horario}</span>
                      <span className="edad">Sala de {curso.edad_sala} años</span>
                    </div>
                  </div>
                  
                  <div className="horarios-permitidos">
                    <p><strong>Registro de ingreso:</strong> {formatearHora(horarioLimites.limiteIngresoInicio.toTimeString())} - {formatearHora(horarioLimites.limiteIngresoFin.toTimeString())}</p>
                    <p><strong>Registro de egreso:</strong> {formatearHora(horarioLimites.limiteEgresoInicio.toTimeString())} - {formatearHora(horarioLimites.limiteEgresoFin.toTimeString())}</p>
                  </div>
                  
                  <div className="disponibilidad">
                    <div className={`disponibilidad-item ${puedeIngreso ? 'disponible' : 'no-disponible'}`}>
                      <span>Ingreso:</span>
                      {puedeIngreso ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    </div>
                    <div className={`disponibilidad-item ${puedeEgreso ? 'disponible' : 'no-disponible'}`}>
                      <span>Egreso:</span>
                      {puedeEgreso ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    </div>
                  </div>

                  {/* Registro de asistencia del curso */}
                  <div className="registro-curso">
                    <h4>Registro de Hoy</h4>
                    
                    <div className="registro-info">
                      <div className="registro-item">
                        <span className="label">Ingreso:</span>
                        <span className={`valor ${registroCurso?.hora_ingreso ? 'registrado' : 'pendiente'}`}>
                          {registroCurso?.hora_ingreso ? formatearHora(registroCurso.hora_ingreso) : 'No registrado'}
                        </span>
                      </div>
                      
                      <div className="registro-item">
                        <span className="label">Salida:</span>
                        <span className={`valor ${registroCurso?.hora_salida ? 'registrado' : 'pendiente'}`}>
                          {registroCurso?.hora_salida ? formatearHora(registroCurso.hora_salida) : 'No registrado'}
                        </span>
                      </div>
                    </div>

                    {/* Botones de registro para este curso */}
                    <div className="botones-registro-curso">
                      {/* Botones de registro directo */}
                      <div className="botones-grupo registro-directo">
                        <h5>Registro Directo</h5>
                        <button
                          onClick={() => registrarIngreso(curso.id)}
                          disabled={
                            !estadoRegistro?.registro_habilitado || 
                            !!registroCurso?.hora_ingreso || 
                            procesando[`ingreso_${curso.id}`] ||
                            !puedeIngreso
                          }
                          className={`btn-registro ingreso ${procesando[`ingreso_${curso.id}`] ? 'procesando' : ''}`}
                        >
                          {procesando[`ingreso_${curso.id}`] ? (
                            <>
                              <Clock className="animate-spin" size={16} />
                              Registrando...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} />
                              Registrar Ingreso
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => registrarSalida(curso.id)}
                          disabled={
                            !estadoRegistro?.registro_habilitado || 
                            !registroCurso?.hora_ingreso ||
                            !!registroCurso?.hora_salida || 
                            procesando[`salida_${curso.id}`] ||
                            !puedeEgreso
                          }
                          className={`btn-registro salida ${procesando[`salida_${curso.id}`] ? 'procesando' : ''}`}
                        >
                          {procesando[`salida_${curso.id}`] ? (
                            <>
                              <Clock className="animate-spin" size={16} />
                              Registrando...
                            </>
                          ) : (
                            <>
                              <XCircle size={16} />
                              Registrar Salida
                            </>
                          )}
                        </button>
                      </div>

                      {/* Botones de aviso al directivo - AHORA SINCRONIZADOS */}
                      <div className="botones-grupo aviso-directivo">
                        <h5>Avisar al Directivo</h5>
                        <button
                          onClick={() => avisarDirectivoIngreso(curso.id)}
                          disabled={
                            !estadoRegistro?.registro_habilitado || 
                            !!registroCurso?.hora_ingreso || 
                            procesando[`aviso_ingreso_${curso.id}`] ||
                            !puedeIngreso
                          }
                          className={`btn-aviso aviso-ingreso ${procesando[`aviso_ingreso_${curso.id}`] ? 'procesando' : ''}`}
                        >
                          {procesando[`aviso_ingreso_${curso.id}`] ? (
                            <>
                              <Clock className="animate-spin" size={16} />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Bell size={16} />
                              Avisar Ingreso
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => avisarDirectivoSalida(curso.id)}
                          disabled={
                            !estadoRegistro?.registro_habilitado || 
                            !registroCurso?.hora_ingreso ||
                            !!registroCurso?.hora_salida || 
                            procesando[`aviso_salida_${curso.id}`] ||
                            !puedeEgreso
                          }
                          className={`btn-aviso aviso-salida ${procesando[`aviso_salida_${curso.id}`] ? 'procesando' : ''}`}
                        >
                          {procesando[`aviso_salida_${curso.id}`] ? (
                            <>
                              <Clock className="animate-spin" size={16} />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={16} />
                              Avisar Salida
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MiAsistencia;