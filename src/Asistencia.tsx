import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, CheckCircle, XCircle, UserCheck, UserX, Calendar,
  ChevronDown, ChevronRight, Save, AlertCircle, ArrowLeft, Shield, History
} from 'lucide-react';
import { cursoAPI, alumnoAPI, familiarAPI, retiroAPI, asistenciaAlumnoAPI, handleAPIError } from './config/api';
import type { UserData } from './config/api';
import './Asistencia.css';

interface Curso {
  id: number; nombre: string; turno: string; horario: string;
  alumnos_inscriptos: number; cupos_disponibles: number;
}

interface Alumno {
  id: number; nombre: string; apellido: string; dni: string; edad: number; curso: number;
}

interface Familiar {
  id: number; nombre: string; apellido: string; dni: string; telefono: string;
  relacion_con_alumno: string; alumno: number;
}

interface AsistenciaAlumno {
  alumno_id: number; presente: boolean; hora_llegada?: string;
}

interface RetiroAlumno {
  alumno_id: number; familiar_id: number; hora_retiro: string;
}

interface AsistenciaProps {
  user: UserData; 
  onBack?: () => void;
  onNavigateToHistorial?: () => void; // Nueva prop para navegar al historial
}

const Asistencia: React.FC<AsistenciaProps> = ({ user, onBack, onNavigateToHistorial }) => {
  const [activeTab, setActiveTab] = useState<'asistencia' | 'retiro'>('asistencia');
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [familiares, setFamiliares] = useState<Familiar[]>([]);
  const [expandedCurso, setExpandedCurso] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [asistenciaData, setAsistenciaData] = useState<Record<number, AsistenciaAlumno[]>>({});
  const [retirosData, setRetirosData] = useState<Record<number, RetiroAlumno[]>>({});
  
  // Estados para el modal de retiro seguro
  const [showRetiroModal, setShowRetiroModal] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState<{alumno: Alumno, cursoId: number} | null>(null);
  const [selectedFamiliarForRetiro, setSelectedFamiliarForRetiro] = useState<number | null>(null);
  const [savingRetiro, setSavingRetiro] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const loadWithErrorHandling = async (apiCall: () => Promise<any>, defaultData: any[] = []) => {
          try {
            const response = await apiCall();
            return { data: response.data, error: null };
          } catch (err: any) {
            const apiError = handleAPIError(err);
            return { data: defaultData, error: apiError.message };
          }
        };

        // 1. PRIMERO cargar los datos básicos
        const [cursosRes, alumnosRes, familiaresRes] = await Promise.all([
          loadWithErrorHandling(() => cursoAPI.misCursos()),
          loadWithErrorHandling(() => alumnoAPI.misAlumnos()),
          loadWithErrorHandling(() => familiarAPI.getAll())
        ]);
        
        // 2. DESPUÉS actualizar el estado
        setCursos(cursosRes.data);
        setAlumnos(alumnosRes.data);
        setFamiliares(familiaresRes.data);
        
        // 3. FINALMENTE cargar asistencia existente CON los cursos ya disponibles
        if (cursosRes.data.length > 0) {
          await loadAsistenciaExistente(cursosRes.data);
          await loadRetirosExistentes(cursosRes.data);
        }
        
        const errors = [cursosRes.error, alumnosRes.error, familiaresRes.error].filter(Boolean);
        if (errors.length) setError(errors.join(', '));
      } catch (err) {
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const isInSchedule = (curso: Curso, isRetiro = false) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [inicio, fin] = curso.horario.split(' - ');
    const [inicioHora, inicioMin] = inicio.split(':').map(Number);
    const [finHora, finMin] = fin.split(':').map(Number);
    const inicioMinutos = inicioHora * 60 + inicioMin;
    const finMinutos = finHora * 60 + finMin + (isRetiro ? 60 : 0);
    return currentTime >= inicioMinutos && currentTime <= finMinutos;
  };

  const getAlumnosByCurso = (cursoId: number) => alumnos.filter(a => a.curso === cursoId);
  const getFamiliaresByAlumno = (alumnoId: number) => familiares.filter(f => f.alumno === alumnoId);

  const handleAsistenciaChange = (cursoId: number, alumnoId: number, presente: boolean) => {
    setAsistenciaData(prev => {
      const cursoAsistencia = prev[cursoId] || [];
      const existingIndex = cursoAsistencia.findIndex(a => a.alumno_id === alumnoId);
      const newItem = {
        alumno_id: alumnoId, presente,
        hora_llegada: presente ? new Date().toTimeString().slice(0, 5) : undefined
      };
      
      return {
        ...prev,
        [cursoId]: existingIndex >= 0 
          ? cursoAsistencia.map((item, i) => i === existingIndex ? newItem : item)
          : [...cursoAsistencia, newItem]
      };
    });
  };

  const handleRetiro = (cursoId: number, alumnoId: number, familiarId: number) => {
    const newRetiro = {
      alumno_id: alumnoId, familiar_id: familiarId,
      hora_retiro: new Date().toTimeString().slice(0, 5)
    };
    
    setRetirosData(prev => {
      const cursoRetiros = prev[cursoId] || [];
      const existingIndex = cursoRetiros.findIndex(r => r.alumno_id === alumnoId);
      return {
        ...prev,
        [cursoId]: existingIndex >= 0
          ? cursoRetiros.map((item, i) => i === existingIndex ? newRetiro : item)
          : [...cursoRetiros, newRetiro]
      };
    });
  };

  // Nueva función para abrir el modal de retiro seguro
  const openRetiroSeguroModal = (alumno: Alumno, cursoId: number) => {
    setSelectedAlumno({ alumno, cursoId });
    setSelectedFamiliarForRetiro(null);
    setShowRetiroModal(true);
  };

  // Nueva función para confirmar el retiro seguro
  const confirmarRetiroSeguro = async () => {
    if (!selectedAlumno || !selectedFamiliarForRetiro) return;

    setSavingRetiro(true);
    try {
      const retiroData = {
        alumno: selectedAlumno.alumno.id,
        familiar: selectedFamiliarForRetiro,
        maestro: user.id,
        fecha: new Date().toISOString().split('T')[0],
        hora_retiro: new Date().toTimeString().slice(0, 8)
      };

      await retiroAPI.create(retiroData);
      
      // Actualizar el estado local
      handleRetiro(selectedAlumno.cursoId, selectedAlumno.alumno.id, selectedFamiliarForRetiro);
      
      // Cerrar modal
      setShowRetiroModal(false);
      setSelectedAlumno(null);
      setSelectedFamiliarForRetiro(null);
      
      alert('Retiro registrado correctamente en la base de datos');
    } catch (err: any) {
      const apiError = handleAPIError(err);
      alert(`Error al registrar el retiro: ${apiError.message}`);
    } finally {
      setSavingRetiro(false);
    }
  };

  const isAlumnoPresente = (cursoId: number, alumnoId: number) => {
    const asistencia = (asistenciaData[cursoId] || []).find(a => a.alumno_id === alumnoId);
    return asistencia?.presente || false;
  };

  const isAlumnoRetirado = (cursoId: number, alumnoId: number) => {
    return (retirosData[cursoId] || []).some(r => r.alumno_id === alumnoId);
  };

  // Función corregida para obtener alumnos según la pestaña
  const getAlumnosByTab = (cursoId: number) => {
    const alumnosCurso = getAlumnosByCurso(cursoId);
    
    if (activeTab === 'asistencia') {
      // En asistencia, mostrar todos los alumnos del curso
      return alumnosCurso;
    } else {
      // En retiros, mostrar solo alumnos presentes (sin importar si ya fueron retirados)
      return alumnosCurso.filter(alumno => isAlumnoPresente(cursoId, alumno.id));
    }
  };

  const saveData = async (cursoId: number, type: 'asistencia' | 'retiro') => {
    try {
      if (type === 'asistencia') {
        const asistenciaList = asistenciaData[cursoId] || [];
        
        if (asistenciaList.length === 0) {
          alert('No hay datos de asistencia para guardar');
          return;
        }

        // Preparar los datos para enviar a la API
        const dataToSend = {
          curso: cursoId,
          fecha: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
          maestro: user.id,
          registros: asistenciaList.map(registro => ({
            alumno: registro.alumno_id,
            presente: registro.presente,
            hora_llegada: registro.hora_llegada || null
          }))
        };

        console.log('Guardando asistencia:', dataToSend);
        
        // Llamar a la API para guardar
        await asistenciaAlumnoAPI.registrarAsistenciaMasiva(dataToSend);
        
        alert('Asistencia guardada correctamente en la base de datos');
        
      } else {
        // Para retiros, ya se guardan individualmente con "Retiro Seguro"
        // Los retiros normales podrían guardarse aquí si quieres
        const retirosList = retirosData[cursoId] || [];
        
        if (retirosList.length === 0) {
          alert('No hay datos de retiros para guardar');
          return;
        }

        // Guardar retiros uno por uno (si no se guardaron con "Retiro Seguro")
        for (const retiro of retirosList) {
          const retiroData = {
            alumno: retiro.alumno_id,
            familiar: retiro.familiar_id,
            maestro: user.id,
            fecha: new Date().toISOString().split('T')[0],
            hora_retiro: retiro.hora_retiro
          };
          
          await retiroAPI.create(retiroData);
        }
        
        alert('Retiros guardados correctamente en la base de datos');
      }
      
    } catch (err: any) {
      const apiError = handleAPIError(err);
      console.error('Error al guardar:', err);
      alert(`Error al guardar ${type === 'asistencia' ? 'asistencia' : 'retiros'}: ${apiError.message}`);
    }
  };

  const loadAsistenciaExistente = async (cursosParaCargar = cursos) => {
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      
      // Usar los cursos pasados como parámetro o los del estado
      const cursosAUsar = cursosParaCargar.length > 0 ? cursosParaCargar : cursos;
      
      if (cursosAUsar.length === 0) {
        console.log('No hay cursos disponibles para cargar asistencia');
        return;
      }
      
      // Cargar asistencia existente para cada curso
      for (const curso of cursosAUsar) {
        try {
          const response = await asistenciaAlumnoAPI.getByCursoAndFecha(curso.id, fechaHoy);
          const asistenciaExistente = response.data;
          
          console.log(`Asistencia encontrada para curso ${curso.id}:`, asistenciaExistente);
          
          if (asistenciaExistente && asistenciaExistente.length > 0) {
            const asistenciaFormateada = asistenciaExistente.map((registro: any) => ({
              alumno_id: registro.alumno,
              presente: registro.presente,
              hora_llegada: registro.hora_llegada
            }));
            
            setAsistenciaData(prev => ({
              ...prev,
              [curso.id]: asistenciaFormateada
            }));
            
            console.log(`Asistencia cargada para curso ${curso.id}:`, asistenciaFormateada);
          }
        } catch (err) {
          // Si no hay asistencia previa, no es un error
          console.log(`No hay asistencia previa para el curso ${curso.id}`);
        }
      }
    } catch (err) {
      console.error('Error al cargar asistencia existente:', err);
    }
  };

  const loadRetirosExistentes = async (cursosParaCargar = cursos) => {
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      
      const cursosAUsar = cursosParaCargar.length > 0 ? cursosParaCargar : cursos;
      
      if (cursosAUsar.length === 0) {
        console.log('No hay cursos disponibles para cargar retiros');
        return;
      }
      
      // Cargar retiros existentes para cada curso
      for (const curso of cursosAUsar) {
        try {
          // Asumiendo que tienes un endpoint similar para retiros por curso y fecha
          const response = await retiroAPI.getByCursoAndFecha(curso.id, fechaHoy);
          const retirosExistentes = response.data;
          
          console.log(`Retiros encontrados para curso ${curso.id}:`, retirosExistentes);
          
          if (retirosExistentes && retirosExistentes.length > 0) {
            const retirosFormateados = retirosExistentes.map((registro: any) => ({
              alumno_id: registro.alumno,
              familiar_id: registro.familiar,
              hora_retiro: registro.hora_retiro
            }));
            
            setRetirosData(prev => ({
              ...prev,
              [curso.id]: retirosFormateados
            }));
            
            console.log(`Retiros cargados para curso ${curso.id}:`, retirosFormateados);
          }
        } catch (err) {
          console.log(`No hay retiros previos para el curso ${curso.id}`);
        }
      }
    } catch (err) {
      console.error('Error al cargar retiros existentes:', err);
    }
  };

  const AlumnoCard: React.FC<{
    alumno: Alumno; cursoId: number; type: 'asistencia' | 'retiro'; inSchedule: boolean;
  }> = ({ alumno, cursoId, type, inSchedule }) => {
    if (type === 'asistencia') {
      const asistencia = (asistenciaData[cursoId] || []).find(a => a.alumno_id === alumno.id);
      const presente = asistencia?.presente || false;
      const tieneRegistro = !!asistencia; // Verificar si existe algún registro
      const esAusente = tieneRegistro && !presente; // Es ausente solo si tiene registro Y no está presente

      return (
        <div className={`alumno-card ${presente ? 'presente' : (esAusente ? 'ausente' : 'sin-registro')}`}>
          <div className="alumno-info">
            <div className={`alumno-status-icon ${presente ? 'presente' : (esAusente ? 'ausente' : 'sin-registro')}`}>
              {presente ? <CheckCircle /> : (esAusente ? <XCircle /> : <AlertCircle />)}
            </div>
            <div className="alumno-details">
              <p className="alumno-name">{alumno.nombre} {alumno.apellido}</p>
              <div className="alumno-meta">
                <span>DNI: {alumno.dni}</span>
                <span className="alumno-meta-separator">•</span>
                <span>{alumno.edad} años</span>
                {asistencia?.hora_llegada && (
                  <>
                    <span className="alumno-meta-separator">•</span>
                    <span>Llegada: {asistencia.hora_llegada}</span>
                  </>
                )}
              </div>
            </div>
            
            {/* BOTONES LADO A LADO - CORREGIDOS */}
            <div className="alumno-buttons-container">
              <button
                onClick={() => handleAsistenciaChange(cursoId, alumno.id, true)}
                disabled={!inSchedule}
                className={`alumno-button marcar-presente ${
                  !inSchedule ? 'disabled' : presente ? 'active' : ''
                }`}
              >
                <CheckCircle />
                Presente
              </button>
              <button
                onClick={() => handleAsistenciaChange(cursoId, alumno.id, false)}
                disabled={!inSchedule}
                className={`alumno-button marcar-ausente ${
                  !inSchedule ? 'disabled' : esAusente ? 'active' : ''
                }`}
              >
                <XCircle />
                Ausente
              </button>
            </div>
          </div>
        </div>
      );

    } else {
      const familiaresList = getFamiliaresByAlumno(alumno.id);
      const retiroInfo = (retirosData[cursoId] || []).find(r => r.alumno_id === alumno.id);

      return (
        <div className={`alumno-card ${retiroInfo ? 'retirado' : 'disponible'}`}>
          <div className="alumno-info">
            <div className="alumno-details">
              <p className="alumno-name">{alumno.nombre} {alumno.apellido}</p>
              <div className="alumno-meta">
                <span>DNI: {alumno.dni}</span>
                <span className="alumno-meta-separator">•</span>
                <span>{alumno.edad} años</span>
              </div>
            </div>
            {retiroInfo && (
              <span className="retiro-badge">
                Retirado: {retiroInfo.hora_retiro}
              </span>
            )}
          </div>
          
          {!retiroInfo && familiaresList.length > 0 && (
            <div className="alumno-actions">
              <div className="alumno-actions">
                <button
                  onClick={() => openRetiroSeguroModal(alumno, cursoId)}
                  disabled={!inSchedule}
                  className={`alumno-button retiro-seguro ${!inSchedule ? 'disabled' : ''}`}
                >
                  <Shield />
                  Retiro Seguro
                </button>
              </div>
            </div>
          )}
          
          {!retiroInfo && familiaresList.length === 0 && (
            <p className="text-sm">No hay familiares autorizados registrados.</p>
          )}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="asistencia-container">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="asistencia-header">
          <div className="asistencia-header-content">
            <div className="asistencia-title-section">
              {onBack && (
                <button onClick={onBack} className="asistencia-back-button">
                  <ArrowLeft />
                </button>
              )}
              <div className="asistencia-icon">
                <Users />
              </div>
              <div className="asistencia-title-text">
                <h1>Asistencia de Alumnos</h1>
                <p>Registro de asistencia y retiros</p>
              </div>
            </div>
            <div className="asistencia-header-actions">
              <div className="asistencia-date">
                <Calendar />
                <span>{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              
              {/* BOTÓN PARA IR AL HISTORIAL */}
              {onNavigateToHistorial && (
                <button 
                  onClick={onNavigateToHistorial}
                  className="asistencia-historial-button"
                  title="Ver historial de asistencia"
                >
                  <History />
                  <span>Ver Historial</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="asistencia-tabs">
            {[
              { key: 'asistencia', label: 'Asistencia', icon: UserCheck },
              { key: 'retiro', label: 'Retiros', icon: UserX }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as 'asistencia' | 'retiro')}
                className={`asistencia-tab ${activeTab === key ? 'active' : ''}`}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="asistencia-error">
            <AlertCircle />
            <p>{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="space-y-4">
          {cursos.map(curso => {
            const alumnosCurso = getAlumnosByTab(curso.id);
            const isExpanded = expandedCurso === curso.id;
            const inSchedule = isInSchedule(curso, activeTab === 'retiro');

            return (
              <div key={curso.id} className="curso-card">
                {/* Curso Header */}
                <div className="curso-header" onClick={() => setExpandedCurso(isExpanded ? null : curso.id)}>
                  <div className="curso-header-content">
                    <div className="curso-info">
                      <div className="curso-chevron">
                        {isExpanded ? <ChevronDown /> : <ChevronRight />}
                      </div>
                      <div className="curso-details">
                        <h3>{curso.nombre}</h3>
                        <div className="curso-meta">
                          <span className="curso-meta-item turno">{curso.turno}</span>
                          <span className="curso-meta-item">
                            <Clock />
                            {curso.horario}
                          </span>
                          <span className="curso-meta-item">
                            {getAlumnosByCurso(curso.id).length} alumnos
                          </span>
                          {activeTab === 'retiro' && (
                            <span className="curso-meta-item presentes">
                              {getAlumnosByTab(curso.id).length} presentes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`curso-status ${inSchedule ? 'en-horario' : 'fuera-horario'}`}>
                      {inSchedule ? <CheckCircle /> : <AlertCircle />}
                      {inSchedule ? 'En horario' : 'Fuera de horario'}
                    </span>
                  </div>
                </div>

                {/* Curso Content */}
                {isExpanded && (
                  <div className="curso-content">
                    <div className="curso-content-header">
                      <h4 className="curso-content-title">
                        {activeTab === 'asistencia' ? 'Lista de Asistencia' : 'Registro de Retiros'}
                      </h4>
                      <button
                        onClick={() => saveData(curso.id, activeTab)}
                        disabled={!inSchedule}
                        className={`save-button ${inSchedule ? 'enabled' : 'disabled'}`}
                      >
                        <Save />
                        Guardar {activeTab === 'asistencia' ? 'Asistencia' : 'Retiros'}
                      </button>
                    </div>

                    {alumnosCurso.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-card">
                          <p>
                            {activeTab === 'asistencia' 
                              ? 'No hay alumnos inscritos en este curso.' 
                              : 'No hay alumnos marcados como presentes.'}
                          </p>
                          {activeTab === 'retiro' && (
                            <p className="text-sm">
                              Primero marca la asistencia en la pestaña "Asistencia" para poder registrar retiros.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {alumnosCurso.map(alumno => (
                          <AlumnoCard
                            key={alumno.id}
                            alumno={alumno}
                            cursoId={curso.id}
                            type={activeTab}
                            inSchedule={inSchedule}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {cursos.length === 0 && !loading && (
          <div className="no-courses-state">
            <div className="no-courses-icon">
              <Users />
            </div>
            <h3>No tienes cursos asignados</h3>
            <p>Contacta al directivo para que te asigne cursos.</p>
          </div>
        )}
      </div>

      {/* Modal de Retiro Seguro */}
      {showRetiroModal && selectedAlumno && (
        <div className="retiro-modal-overlay">
          <div className="retiro-modal">
            <div className="retiro-modal-header">
              <Shield />
              <h3>Retiro Seguro</h3>
            </div>
            
            <div className="retiro-modal-alumno">
              <p>Alumno a retirar:</p>
              <div className="retiro-modal-alumno-info">
                <p className="font-medium">{selectedAlumno.alumno.nombre} {selectedAlumno.alumno.apellido}</p>
                <p className="text-sm">DNI: {selectedAlumno.alumno.dni}</p>
              </div>
            </div>

            <div className="retiro-modal-select-container">
              <label>Seleccionar familiar autorizado:</label>
              <select
                value={selectedFamiliarForRetiro || ''}
                onChange={(e) => setSelectedFamiliarForRetiro(parseInt(e.target.value))}
                className="retiro-modal-select"
              >
                <option value="">-- Seleccionar familiar --</option>
                {getFamiliaresByAlumno(selectedAlumno.alumno.id).map(familiar => (
                  <option key={familiar.id} value={familiar.id}>
                    {familiar.nombre} {familiar.apellido} ({familiar.relacion_con_alumno})
                    {familiar.telefono && ` - Tel: ${familiar.telefono}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="retiro-modal-actions">
              <button
                onClick={() => setShowRetiroModal(false)}
                disabled={savingRetiro}
                className="retiro-modal-button cancel"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRetiroSeguro}
                disabled={!selectedFamiliarForRetiro || savingRetiro}
                className="retiro-modal-button confirm"
              >
                {savingRetiro ? 'Guardando...' : 'Confirmar Retiro'}
              </button>
            </div>

            <div className="retiro-modal-info">
              <p>
                <strong>Retiro Seguro:</strong> Este retiro se guardará automáticamente en la base de datos con todos los detalles de seguridad.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Asistencia;