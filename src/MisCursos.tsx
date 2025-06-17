import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Calendar, AlertCircle, Save, X, ArrowLeft, DollarSign } from 'lucide-react';
import { cursoAPI, cicloLectivoAPI, userAPI, handleAPIError, UserData } from './config/api';
import './miscursos.css';

interface CicloLectivo { id: number; inicio: string; finalizacion: string; }
interface Maestro { id: number; first_name: string; last_name: string; username: string; }
interface Curso {
  id: number; nombre: string; cupo_habilitado: number; turno: 'mañana' | 'intermedio' | 'tarde';
  horario: string; edad_sala: number; ciclo_lectivo: number; maestros: number[];
  maestros_nombres: string[]; alumnos_inscriptos: number; cupos_disponibles: number;
  cuota_mensual: number; cuota_mensual_formatted: string; dia_vencimiento_cuota: number;
}
interface FormData {
  nombre: string; cupo_habilitado: number; turno: 'mañana' | 'intermedio' |'tarde'; horario: string;
  edad_sala: number; ciclo_lectivo: number; maestros: number[]; hora_inicio: string; 
  hora_fin: string; cuota_mensual: number; dia_vencimiento_cuota: number;
}
interface MisCursosProps { user: UserData; onNavigateBack: () => void | Promise<void>; }

// Tipos para componentes
interface StatusMessageProps {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
}

interface CursoCardProps {
  curso: Curso;
  onEdit: (curso: Curso) => void;
  onDelete: (curso: Curso) => Promise<void>;
  onOpenMaestras: (curso: Curso) => void;
  submitting: boolean;
  isDirectivo: boolean;
}

// Componente de mensaje de estado - Movido fuera para evitar re-creación
const StatusMessage: React.FC<StatusMessageProps> = ({ message, type, onClose }) => (
  <div className={`status-message ${type}`}>
    {type === 'error' && <AlertCircle className="h-4 w-4" />}
    {message}
    <button onClick={onClose} className={`ml-2 text-${type === 'error' ? 'red' : 'green'}-600 hover:text-${type === 'error' ? 'red' : 'green'}-800`}>
      <X className="h-4 w-4" />
    </button>
  </div>
);

// Componente de tarjeta de curso con iconos Unicode (más compatibles)
const CursoCard: React.FC<CursoCardProps> = React.memo(({ curso, onEdit, onDelete, onOpenMaestras, submitting, isDirectivo }) => (
  <div className="curso-card">
    <div className="curso-card-content">
      <div className="curso-card-header">
        <h3 className="curso-card-title">{curso.nombre}</h3>
        <div className="curso-card-actions">
          {isDirectivo && (
            <button 
              onClick={() => onOpenMaestras(curso)} 
              className="action-button maestras" 
              disabled={submitting} 
              title="Asignar Maestras"
            >
              {/* Icono Unicode para asignar maestras */}
              <span style={{ fontSize: '16px' }}>👥</span>
            </button>
          )}
          <button 
            onClick={() => onEdit(curso)} 
            className="action-button" 
            disabled={submitting}
            title="Editar curso"
          >
            {/* Icono Unicode para editar */}
            <span style={{ fontSize: '16px' }}>✏️</span>
          </button>
          <button 
            onClick={() => onDelete(curso)} 
            className="action-button delete" 
            disabled={submitting}
            title="Eliminar curso"
          >
            {/* Icono Unicode para eliminar */}
            <span style={{ fontSize: '16px' }}>🗑️</span>
          </button>
        </div>
      </div>
      
      <div className="curso-info">
        <div className="curso-info-item">
          <span style={{ fontSize: '14px' }}>🕐</span>
          <span className="capitalize">{curso.turno}</span>
          <span>•</span>
          <span>{curso.horario}</span>
        </div>
        <div className="curso-info-item">
          <span style={{ fontSize: '14px' }}>📅</span>
          <span>Sala de {curso.edad_sala} años</span>
        </div>
        <div className="curso-info-item">
          <span style={{ fontSize: '14px' }}>👨‍👩‍👧‍👦</span>
          <span>{curso.alumnos_inscriptos} / {curso.cupo_habilitado} alumnos</span>
        </div>
        <div className="curso-info-item">
          <span style={{ fontSize: '14px' }}>💰</span>
          <span className="cuota-mensual">{curso.cuota_mensual_formatted || `$${curso.cuota_mensual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}</span>
          <span className="vencimiento-info">• Vence el {curso.dia_vencimiento_cuota}</span>
        </div>
        
        <div className="maestros-section">
          <div className="maestros-label">Maestras:</div>
          {curso.maestros_nombres.length > 0 ? (
            <div className="maestros-list">
              {curso.maestros_nombres.map((nombre: string, index: number) => (
                <span key={index} className="maestro-badge">{nombre}</span>
              ))}
            </div>
          ) : (
            <div className="no-maestras">
              <span className="text-gray-400">Sin maestras asignadas</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="curso-card-footer">
        <div className="cupos-info">
          <span className="label">Cupos disponibles:</span>
          <span className={`value ${curso.cupos_disponibles > 0 ? 'available' : 'full'}`}>
            {curso.cupos_disponibles}
          </span>
        </div>
      </div>
    </div>
  </div>
));

const MisCursos: React.FC<MisCursosProps> = ({ user, onNavigateBack }) => {
  // Estados principales
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [ciclosLectivos, setCiclosLectivos] = useState<CicloLectivo[]>([]);
  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para modales
  const [showModal, setShowModal] = useState(false);
  const [showMaestrasModal, setShowMaestrasModal] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [cursoParaMaestras, setCursoParaMaestras] = useState<Curso | null>(null);
  const [maestrasAsignadas, setMaestrasAsignadas] = useState<number[]>([]);
  
  // Estado del formulario
  const [formData, setFormData] = useState<FormData>({
    nombre: '', cupo_habilitado: 1, turno: 'mañana', horario: '', edad_sala: 3,
    ciclo_lectivo: 0, maestros: [], hora_inicio: '08:00', hora_fin: '12:00',
    cuota_mensual: 0, dia_vencimiento_cuota: 10
  });

  // Estados para validación de cuota
  const [cuotaInput, setCuotaInput] = useState('');
  const [cuotaError, setCuotaError] = useState('');

  // Determine if user is directivo
  const isDirectivo = user.es_directivo;

  // Funciones utilitarias memoizadas
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 5; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        options.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return options;
  }, []);

  const parseHorario = useCallback((horario: string) => {
    const match = horario.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    return match ? { 
      hora_inicio: `${match[1].padStart(2, '0')}:${match[2]}`, 
      hora_fin: `${match[3].padStart(2, '0')}:${match[4]}` 
    } : { hora_inicio: '08:00', hora_fin: '12:00' };
  }, []);

  const createHorario = useCallback((horaInicio: string, horaFin: string) => `${horaInicio} - ${horaFin}`, []);

  const showMessage = useCallback((message: string, type: 'error' | 'success') => {
    if (type === 'error') setError(message);
    else setSuccess(message);
    setTimeout(() => { setError(''); setSuccess(''); }, 5000);
  }, []);

  // Función para validar y formatear cuota
  const validateCuota = useCallback((value: string) => {
    // Remover caracteres no numéricos excepto punto y coma
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    
    // Reemplazar coma por punto para decimales
    const normalizedValue = cleanValue.replace(',', '.');
    
    // Validar formato de número decimal
    const numberRegex = /^\d+(\.\d{0,2})?$/;
    
    if (normalizedValue === '') {
      setCuotaError('');
      return 0;
    }
    
    if (!numberRegex.test(normalizedValue)) {
      setCuotaError('Ingrese un monto válido (máximo 2 decimales)');
      return null;
    }
    
    const numValue = parseFloat(normalizedValue);
    
    if (isNaN(numValue) || numValue < 0) {
      setCuotaError('El monto debe ser un número positivo');
      return null;
    }
    
    if (numValue > 999999.99) {
      setCuotaError('El monto no puede exceder $999,999.99');
      return null;
    }
    
    setCuotaError('');
    return numValue;
  }, []);

  // Manejar cambio en input de cuota
  const handleCuotaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCuotaInput(value);
    
    const validatedValue = validateCuota(value);
    if (validatedValue !== null) {
      setFormData(prev => ({ ...prev, cuota_mensual: validatedValue }));
    }
  }, [validateCuota]);

  // FUNCIÓN CORREGIDA: Cargar datos según el tipo de usuario
  const loadCursos = useCallback(async () => {
    // Si es directivo, cargar todos los cursos, si es maestro, solo sus cursos
    const response = isDirectivo ? await cursoAPI.getAll() : await cursoAPI.misCursos();
    setCursos(response.data);
    return response.data;
  }, [isDirectivo]);

  // FUNCIÓN CORREGIDA: Cargar datos iniciales según permisos
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Si es directivo, necesita todos los datos para el formulario
      if (isDirectivo) {
        const ciclosResponse = await cicloLectivoAPI.getAll();
        setCiclosLectivos(ciclosResponse.data);
        
        if (ciclosResponse.data.length === 0) {
          await loadCursos(); // Cargar cursos aunque no haya ciclos
          return;
        }
        
        const [, maestrosResponse] = await Promise.all([
          loadCursos(), 
          userAPI.getAll()
        ]);
        setMaestros(maestrosResponse.data.filter((u: any) => u.es_maestro || (u.es_maestro && u.es_directivo)));
      } else {
        // Si es solo maestro, solo cargar sus cursos
        await loadCursos();
      }
      
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      showMessage(handleAPIError(err).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [loadCursos, showMessage, isDirectivo]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // Función corregida para asignar maestra
  const asignarMaestra = useCallback(async (cursoId: number, maestroId: number, accion: 'asignar' | 'desasignar') => {
    try {
      setSubmitting(true);
      
      const response = await cursoAPI.asignarMaestro(cursoId, {
        maestro_id: maestroId,
        accion: accion
      });
      
      showMessage(response.data.message, 'success');
      await loadCursos();
    } catch (err: any) {
      console.error('Error al asignar maestra:', err);
      const errorMsg = handleAPIError(err).message;
      showMessage(`Error al ${accion} maestra: ${errorMsg}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [showMessage, loadCursos]);

  const saveMaestrasAssignment = useCallback(async () => {
    if (!cursoParaMaestras) return;
    
    try {
      setSubmitting(true);
      const maestrasActuales = new Set(cursoParaMaestras.maestros);
      const nuevasAsignaciones = new Set(maestrasAsignadas);
      
      const maestrasParaAsignar = [...nuevasAsignaciones].filter(id => !maestrasActuales.has(id));
      const maestrasParaDesasignar = [...maestrasActuales].filter(id => !nuevasAsignaciones.has(id));
      
      await Promise.all([
        ...maestrasParaAsignar.map(id => asignarMaestra(cursoParaMaestras.id, id, 'asignar')),
        ...maestrasParaDesasignar.map(id => asignarMaestra(cursoParaMaestras.id, id, 'desasignar'))
      ]);
      
      showMessage('Asignaciones actualizadas correctamente', 'success');
      setShowMaestrasModal(false);
    } catch (err: any) {
      showMessage('Error al guardar las asignaciones', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [cursoParaMaestras, maestrasAsignadas, asignarMaestra, showMessage]);

  // Gestión de formularios
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    // Validar cuota antes de enviar
    if (cuotaError) {
      showMessage('Por favor corrige los errores en el formulario', 'error');
      return;
    }
    
    try {
      setSubmitting(true);
      const dataToSubmit = { ...formData, horario: createHorario(formData.hora_inicio, formData.hora_fin) };
      
      if (editingCurso) {
        await cursoAPI.update(editingCurso.id, dataToSubmit);
        showMessage('Curso actualizado exitosamente', 'success');
      } else {
        await cursoAPI.create(dataToSubmit);
        showMessage('Curso creado exitosamente', 'success');
      }
      
      await loadCursos();
      setShowModal(false);
    } catch (err: any) {
      showMessage(`Error al ${editingCurso ? 'actualizar' : 'crear'} curso: ${handleAPIError(err).message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, formData, createHorario, editingCurso, showMessage, loadCursos, cuotaError]);

  const handleDelete = useCallback(async (curso: Curso) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el curso "${curso.nombre}"?`)) return;
    
    try {
      await cursoAPI.delete(curso.id);
      showMessage('Curso eliminado exitosamente', 'success');
      await loadCursos();
    } catch (err: any) {
      showMessage(`Error al eliminar curso: ${handleAPIError(err).message}`, 'error');
    }
  }, [showMessage, loadCursos]);

  // Gestión de modales - FUNCIÓN CORREGIDA
  const openCreateModal = useCallback(() => {
    setEditingCurso(null);
    setFormData({
      nombre: '', 
      cupo_habilitado: 1, 
      turno: 'mañana', 
      horario: '', 
      edad_sala: 3,
      ciclo_lectivo: ciclosLectivos[0]?.id || 0, 
      maestros: [], 
      hora_inicio: '08:00', 
      hora_fin: '12:00', 
      cuota_mensual: 0,
      dia_vencimiento_cuota: 10 // CAMPO AGREGADO AQUÍ
    });
    setCuotaInput('');
    setCuotaError('');
    setShowModal(true);
  }, [ciclosLectivos]);

  const openEditModal = useCallback((curso: Curso) => {
    const { hora_inicio, hora_fin } = parseHorario(curso.horario);
    setEditingCurso(curso);
    setFormData({ 
      ...curso, 
      hora_inicio, 
      hora_fin,
      dia_vencimiento_cuota: curso.dia_vencimiento_cuota || 10 // Valor por defecto si no existe
    });
    setCuotaInput(curso.cuota_mensual.toString());
    setCuotaError('');
    setShowModal(true);
  }, [parseHorario]);

  const openMaestrasModal = useCallback((curso: Curso) => {
    setCursoParaMaestras(curso);
    setMaestrasAsignadas([...curso.maestros]);
    setShowMaestrasModal(true);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['cupo_habilitado', 'edad_sala', 'ciclo_lectivo', 'dia_vencimiento_cuota'].includes(name) 
        ? parseInt(value) 
        : value
    }));
  }, []);

  // Componente de formulario - SOLO PARA DIRECTIVOS
  const FormModal = useMemo(() => {
    if (!showModal || !isDirectivo) return null;
    
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">{editingCurso ? 'Editar Curso' : 'Crear Nuevo Curso'}</h2>
            <button onClick={() => setShowModal(false)} className="modal-close" disabled={submitting}>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="modal-body">
            {error && <StatusMessage message={error} type="error" onClose={() => setError('')} />}
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nombre del Curso *</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} 
                       required disabled={submitting} className="form-input" placeholder="Ej: Sala Amarilla" />
              </div>
              
              <div className="form-group">
                <label className="form-label">Cupo Habilitado *</label>
                <input type="number" name="cupo_habilitado" value={formData.cupo_habilitado} onChange={handleInputChange} 
                       required min="1" disabled={submitting} className="form-input" />
              </div>
              
              <div className="form-group">
                <label className="form-label">Turno *</label>
                <select name="turno" value={formData.turno} onChange={handleInputChange} required disabled={submitting} className="form-select">
                  <option value="mañana">Mañana</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="tarde">Tarde</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Edad de la Sala *</label>
                <select name="edad_sala" value={formData.edad_sala} onChange={handleInputChange} required disabled={submitting} className="form-select">
                  <option value={0}>meses (0-11 meses)</option>
                  <option value={1}>1 año</option>
                  <option value={2}>2 años</option>
                  <option value={3}>3 años</option>
                  <option value={4}>4 años</option>
                  <option value={5}>5 años</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Ciclo Lectivo *</label>
                <select name="ciclo_lectivo" value={formData.ciclo_lectivo} onChange={handleInputChange} required disabled={submitting} className="form-select">
                  <option value="">Seleccionar ciclo lectivo</option>
                  {ciclosLectivos.map(ciclo => (
                    <option key={ciclo.id} value={ciclo.id}>
                      {ciclo.inicio} - {ciclo.finalizacion}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Cuota Mensual *</label>
                <div className="input-with-icon">
                  <DollarSign className="h-4 w-4 input-icon" />
                  <input 
                    type="text" 
                    value={cuotaInput} 
                    onChange={handleCuotaChange}
                    required 
                    disabled={submitting} 
                    className={`form-input ${cuotaError ? 'error' : ''}`}
                    placeholder="0.00" 
                  />
                </div>
                {cuotaError && <span className="form-error">{cuotaError}</span>}
                <small className="form-help">Ingrese el monto sin el símbolo $. Use punto o coma para decimales.</small>
              </div>
              
              <div className="form-group">
                <label className="form-label">Día de Vencimiento *</label>
                <select 
                  name="dia_vencimiento_cuota" 
                  value={formData.dia_vencimiento_cuota} 
                  onChange={handleInputChange} 
                  required 
                  disabled={submitting} 
                  className="form-select"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(dia => (
                    <option key={dia} value={dia}>
                      Día {dia}
                    </option>
                  ))}
                </select>
                <small className="form-help">
                  Día del mes límite para pagar la cuota (máximo día 28 para evitar problemas con febrero)
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Hora de Inicio *</label>
                <select name="hora_inicio" value={formData.hora_inicio} onChange={handleInputChange} required disabled={submitting} className="form-select">
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Hora de Fin *</label>
                <select name="hora_fin" value={formData.hora_fin} onChange={handleInputChange} required disabled={submitting} className="form-select">
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="modal-actions">
              <button type="button" onClick={() => setShowModal(false)} disabled={submitting} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={submitting || !!cuotaError} className="btn-primary">
                <Save className="h-4 w-4" />
                {submitting ? 'Guardando...' : (editingCurso ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }, [showModal, isDirectivo, editingCurso, submitting, error, formData, ciclosLectivos, cuotaInput, cuotaError, timeOptions, handleInputChange, handleCuotaChange, handleSubmit]);

  // Componente del modal de maestras - SOLO PARA DIRECTIVOS
  const MaestrasModal = useMemo(() => {
    if (!showMaestrasModal || !cursoParaMaestras || !isDirectivo) return null;
    
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Asignar Maestras - {cursoParaMaestras.nombre}</h2>
            <button onClick={() => setShowMaestrasModal(false)} className="modal-close" disabled={submitting}>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="maestras-selection">
              {maestros.map(maestro => (
                <label key={maestro.id} className="maestro-checkbox">
                  <input
                    type="checkbox"
                    checked={maestrasAsignadas.includes(maestro.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMaestrasAsignadas(prev => [...prev, maestro.id]);
                      } else {
                        setMaestrasAsignadas(prev => prev.filter(id => id !== maestro.id));
                      }
                    }}
                    disabled={submitting}
                  />
                  <span>{maestro.first_name} {maestro.last_name} ({maestro.username})</span>
                </label>
              ))}
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowMaestrasModal(false)} disabled={submitting} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={saveMaestrasAssignment} disabled={submitting} className="btn-primary">
                <Save className="h-4 w-4" />
                {submitting ? 'Guardando...' : 'Guardar Asignaciones'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [showMaestrasModal, cursoParaMaestras, isDirectivo, maestros, maestrasAsignadas, submitting, saveMaestrasAssignment]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando cursos...</p>
      </div>
    );
  }

  return (
    <div className="miscursos-container">
      <div className="page-header">
        <button onClick={onNavigateBack} className="btn-back">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <h1 className="page-title">
          {isDirectivo ? 'Gestión de Cursos' : 'Mis Cursos Asignados'}
        </h1>
        {isDirectivo && (
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            Nuevo Curso
          </button>
        )}
      </div>

      {(error || success) && (
        <div className="messages-container">
          {error && <StatusMessage message={error} type="error" onClose={() => setError('')} />}
          {success && <StatusMessage message={success} type="success" onClose={() => setSuccess('')} />}
        </div>
      )}

      {cursos.length === 0 ? (
        <div className="empty-state">
          <Calendar className="h-12 w-12" />
          <h3>No hay cursos disponibles</h3>
          <p>No se encontraron cursos en el sistema.</p>
          {isDirectivo && (
            <button onClick={openCreateModal} className="btn-primary">
              <Plus className="h-4 w-4" />
              Crear Primer Curso
            </button>
          )}
        </div>
      ) : (
        <div className="cursos-grid">
          {cursos.map(curso => (
            <CursoCard
              key={curso.id}
              curso={curso}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onOpenMaestras={openMaestrasModal}
              submitting={submitting}
              isDirectivo={isDirectivo}
            />
          ))}
        </div>
      )}

      {FormModal}
      {MaestrasModal}
    </div>
  );
};

export default MisCursos;