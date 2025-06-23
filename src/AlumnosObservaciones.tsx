import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Edit3, Save, X, FileText, Search, AlertCircle, 
  BookOpen, Calendar, Users, ChevronDown, ChevronRight, School, Download, FileDown
} from 'lucide-react';
import { alumnoAPI, handleAPIError } from './config/api';
import './AlumnosObservaciones.css'
 import { 
   exportarObservacionesAWord, 
   exportarTodosLosCursos, 
   tieneObservacionesParaExportar 
} from './observacionesWord';
interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  es_maestro: boolean;
  es_directivo: boolean;
}

interface Familiar {
  id?: number;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  direccion: string;
  mail: string;
  relacion_con_alumno: string;
  alumno?: number;
}

interface Alumno {
  id?: number;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  curso: number | null;
  curso_nombre?: string;
  edad?: number;
  familiares?: Familiar[];
  observaciones?: string;
}

interface Curso {
  id: number;
  nombre: string;
  turno: string;
  horario: string;
  edad_sala: number;
  cupos_disponibles: number;
}

interface CursoConAlumnos extends Curso {
  alumnos: Alumno[];
  expanded: boolean;
  searchTerm: string;
}

interface AlumnosObservacionesProps {
  user: UserData;
  onBack: () => void;
}

// Componente SearchBar
const SearchBar = ({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string;
}) => {
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className="search-bar">
      <div className="search-input-container">
        <Search className="search-icon" />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="search-input"
        />
        {value && (
          <button
            onClick={handleClear}
            className="clear-search-btn"
            title="Limpiar búsqueda"
            type="button"
          >
            <X />
          </button>
        )}
      </div>
    </div>
  );
};

// Componente AlumnoObservacionCard - MOVIDO FUERA del componente principal
const AlumnoObservacionCard = React.memo(({ 
  alumno, 
  isEditing, 
  isSaving, 
  observaciones, 
  onStartEditing, 
  onSaveObservations, 
  onCancelEditing, 
  onUpdateObservations 
}: { 
  alumno: Alumno;
  isEditing: boolean;
  isSaving: boolean;
  observaciones: string;
  onStartEditing: (alumnoId: number) => void;
  onSaveObservations: (alumnoId: number) => void;
  onCancelEditing: (alumnoId: number) => void;
  onUpdateObservations: (alumnoId: number, value: string) => void;
}) => {
  if (!alumno.id) return null;

  return (
    <div className="alumno-card observaciones-card">
      <div className="alumno-header">
        <div className="alumno-avatar"><User /></div>
        <div className="alumno-info">
          <h4>{alumno.nombre} {alumno.apellido}</h4>
          <p className="dni">DNI: {alumno.dni}</p>
          {alumno.edad && <p className="edad">{alumno.edad} años</p>}
          
        </div>
        <div className="alumno-actions">
          {!isEditing ? (
            <button 
              onClick={() => onStartEditing(alumno.id!)} 
              className="btn-edit" 
              title="Editar observaciones"
            >
              <Edit3 />
            </button>
          ) : (
            <div className="edit-actions">
              <button 
                onClick={() => onSaveObservations(alumno.id!)} 
                className="btn-save" 
                title="Guardar observaciones"
                disabled={isSaving}
              >
                <Save />
              </button>
              <button 
                onClick={() => onCancelEditing(alumno.id!)} 
                className="btn-cancel" 
                title="Cancelar edición"
                disabled={isSaving}
              >
                <X />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="observaciones-section">
        <div className="observaciones-header">
          <FileText />
          <h5>Observaciones</h5>
        </div>
        
        {!isEditing ? (
          <div className="observaciones-display">
            {observaciones ? (
              <p className="observaciones-text">{observaciones}</p>
            ) : (
              <p className="no-observaciones">Sin observaciones registradas</p>
            )}
          </div>
        ) : (
          <div className="observaciones-form">
            <textarea
              value={observaciones}
              onChange={(e) => onUpdateObservations(alumno.id!, e.target.value)}
              placeholder="Escribe las observaciones sobre el alumno..."
              rows={4}
              className="observaciones-textarea"
              disabled={isSaving}
              autoFocus
            />
            <div className="character-count">
              {observaciones.length} caracteres
            </div>
          </div>
        )}
      </div>

      {/* Mostrar información de familiares si está disponible */}
      {alumno.familiares && alumno.familiares.length > 0 && (
        <div className="familiares-info">
          <h6>Contactos familiares:</h6>
          {alumno.familiares.slice(0, 2).map((familiar, index) => (
            <div key={index} className="familiar-contact">
              <strong>{familiar.nombre} {familiar.apellido}</strong>
              <span className="relacion">({familiar.relacion_con_alumno})</span>
              {familiar.telefono && <span className="telefono">📞 {familiar.telefono}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const AlumnosObservaciones: React.FC<AlumnosObservacionesProps> = ({ user, onBack }) => {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [cursosConAlumnos, setCursosConAlumnos] = useState<CursoConAlumnos[]>([]);
  const [alumnosSinCurso, setAlumnosSinCurso] = useState<Alumno[]>([]);
  const [searchTermSinCurso, setSearchTermSinCurso] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingObservations, setEditingObservations] = useState<{[key: number]: boolean}>({});
  const [observationsForm, setObservationsForm] = useState<{[key: number]: string}>({});
  const [savingObservations, setSavingObservations] = useState<{[key: number]: boolean}>({});
const [exportingWord, setExportingWord] = useState<{[key: number]: boolean}>({});
const [exportingAll, setExportingAll] = useState(false);
  useEffect(() => {
    if (!user.es_maestro && !user.es_directivo) {
      setError('No tienes permisos para acceder a esta sección');
      return;
    }
    loadData();
  }, [user]);

  // Función para ordenar alumnos alfabéticamente
  const sortAlumnosAlphabetically = useCallback((alumnos: Alumno[]) => {
    return [...alumnos].sort((a, b) => {
      const nameA = `${a.apellido} ${a.nombre}`.toLowerCase();
      const nameB = `${b.apellido} ${b.nombre}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, []);

  // Función para filtrar alumnos por término de búsqueda
  const filterAlumnos = useCallback((alumnos: Alumno[], searchTerm: string) => {
    if (!searchTerm.trim()) return alumnos;
    
    const term = searchTerm.toLowerCase();
    return alumnos.filter(alumno => {
      const fullName = `${alumno.nombre} ${alumno.apellido}`.toLowerCase();
      return fullName.includes(term) || 
             alumno.nombre.toLowerCase().includes(term) || 
             alumno.apellido.toLowerCase().includes(term);
    });
  }, []);

  const groupAlumnosByCurso = useCallback(() => {
    const cursosMap = new Map<number, CursoConAlumnos>();
    
    alumnos.forEach(alumno => {
      if (alumno.curso && alumno.curso_nombre) {
        if (!cursosMap.has(alumno.curso)) {
          cursosMap.set(alumno.curso, {
            id: alumno.curso,
            nombre: alumno.curso_nombre,
            turno: '',
            horario: '',
            edad_sala: 0,
            cupos_disponibles: 0,
            alumnos: [],
            expanded: false,
            searchTerm: ''
          });
        }
        cursosMap.get(alumno.curso)!.alumnos.push(alumno);
      }
    });

    const cursosConAlumnosData: CursoConAlumnos[] = Array.from(cursosMap.values()).map(curso => ({
      ...curso,
      alumnos: sortAlumnosAlphabetically(curso.alumnos)
    }));

    setCursosConAlumnos(cursosConAlumnosData);
    setAlumnosSinCurso(sortAlumnosAlphabetically(alumnos.filter(alumno => !alumno.curso)));
  }, [alumnos, sortAlumnosAlphabetically]);

  const toggleCursoExpansion = useCallback((cursoId: number) => {
    setCursosConAlumnos(prev => 
      prev.map(curso => 
        curso.id === cursoId ? { ...curso, expanded: !curso.expanded } : curso
      )
    );
  }, []);

  const updateCursoSearchTerm = useCallback((cursoId: number, searchTerm: string) => {
    setCursosConAlumnos(prev => 
      prev.map(curso => 
        curso.id === cursoId ? { ...curso, searchTerm } : curso
      )
    );
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const alumnosResponse = user.es_directivo && !user.es_maestro 
        ? await alumnoAPI.getAll()
        : await alumnoAPI.misAlumnos();
      
      setAlumnos(alumnosResponse.data);
      
      // Inicializar el formulario de observaciones con los datos existentes
      const initialObservations: {[key: number]: string} = {};
      alumnosResponse.data.forEach((alumno: Alumno) => {
        if (alumno.id) {
          initialObservations[alumno.id] = alumno.observaciones || '';
        }
      });
      setObservationsForm(initialObservations);
      
    } catch (error: any) {
      const apiError = handleAPIError(error);
      setError(apiError.message);
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (alumnos.length > 0) {
      groupAlumnosByCurso();
    }
  }, [alumnos, groupAlumnosByCurso]);

  // Funciones con useCallback para evitar re-renders
  const startEditingObservations = useCallback((alumnoId: number) => {
    setEditingObservations(prev => ({ ...prev, [alumnoId]: true }));
    setError(null);
  }, []);

  const cancelEditingObservations = useCallback((alumnoId: number) => {
    setEditingObservations(prev => ({ ...prev, [alumnoId]: false }));
    // Restaurar el valor original
    const alumno = alumnos.find(a => a.id === alumnoId);
    if (alumno) {
      setObservationsForm(prev => ({ 
        ...prev, 
        [alumnoId]: alumno.observaciones || '' 
      }));
    }
    setError(null);
  }, [alumnos]);

 const saveObservations = useCallback(async (alumnoId: number) => {
  try {
    setSavingObservations(prev => ({ ...prev, [alumnoId]: true }));
    setError(null);
    
    const alumno = alumnos.find(a => a.id === alumnoId);
    if (!alumno) {
      throw new Error('Alumno no encontrado');
    }

    const observaciones = observationsForm[alumnoId] || '';
    
    console.log('Saving observations for alumno:', alumnoId, 'Observations:', observaciones);

    // Option 1: Use the specific updateObservations method
    const response = await alumnoAPI.updateObservations(alumnoId, observaciones);
    
    // Option 2: Alternative - send the full alumno object
    // const updatedData = {
    //   ...alumno,
    //   observaciones: observaciones
    // };
    // const response = await alumnoAPI.update(alumnoId, updatedData);
    
    console.log('Save response:', response);
    
    // Actualizar el estado local
    setAlumnos(prev => 
      prev.map(a => 
        a.id === alumnoId 
          ? { ...a, observaciones: observaciones }
          : a
      )
    );
    
    setEditingObservations(prev => ({ ...prev, [alumnoId]: false }));
    
    // Optional: Show success message
    console.log('Observations saved successfully');
    
  } catch (error: any) {
    console.error('Error saving observations:', error);
    console.error('Error response:', error.response?.data);
    
    const apiError = handleAPIError(error);
    setError(`Error al guardar observaciones: ${apiError.message}`);
  } finally {
    setSavingObservations(prev => ({ ...prev, [alumnoId]: false }));
  }
}, [alumnos, observationsForm]);
const exportarCursoAWord = useCallback(async (curso: CursoConAlumnos) => {
  try {
    setExportingWord(prev => ({ ...prev, [curso.id]: true }));
    
    if (!tieneObservacionesParaExportar(curso.alumnos)) {
      setError('Este curso no tiene alumnos con observaciones para exportar');
      return;
    }

    await exportarObservacionesAWord({
      alumnos: curso.alumnos,
      cursoNombre: curso.nombre
    });
    
    setError(null);
    console.log(`Observaciones de ${curso.nombre} exportadas correctamente`);
    
  } catch (error: any) {
    console.error('Error al exportar observaciones:', error);
    setError(`Error al exportar observaciones: ${error.message}`);
  } finally {
    setExportingWord(prev => ({ ...prev, [curso.id]: false }));
  }
}, []);

const exportarTodoAWord = useCallback(async () => {
  try {
    setExportingAll(true);
    setError(null);
    
    const todosLosAlumnos = cursosConAlumnos.flatMap(curso => curso.alumnos);
    
    if (!tieneObservacionesParaExportar(todosLosAlumnos)) {
      setError('No hay observaciones para exportar');
      return;
    }

    await exportarTodosLosCursos(cursosConAlumnos);
    
    console.log('Todas las observaciones exportadas correctamente');
    
  } catch (error: any) {
    console.error('Error al exportar todas las observaciones:', error);
    setError(`Error al exportar: ${error.message}`);
  } finally {
    setExportingAll(false);
  }
}, [cursosConAlumnos]);
  const updateObservations = useCallback((alumnoId: number, value: string) => {
    setObservationsForm(prev => ({ ...prev, [alumnoId]: value }));
  }, []);

  if (!user.es_maestro && !user.es_directivo) {
    return (
      <div className="mis-alumnos-container">
        <div className="error-message">
          <AlertCircle />
          <p>No tienes permisos para acceder a esta sección</p>
          <button onClick={onBack} className="btn-primary">Volver</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mis-alumnos-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando información de alumnos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mis-alumnos-container observaciones-container">
      <div className="header">
        <button onClick={onBack} className="btn-back"><X />Volver</button>
        <h1>
            <FileText />
            {user.es_directivo && !user.es_maestro ? 'Observaciones de Todos los Alumnos' : 'Observaciones de Mis Alumnos'}
        </h1>
        <div className="header-actions">
            <button 
            onClick={exportarTodoAWord}
            className="btn-export-all"
            disabled={exportingAll || cursosConAlumnos.length === 0}
            title="Exportar todas las observaciones a Word"
            >
            {exportingAll ? (
                <div className="spinner-small"></div>
            ) : (
                <FileDown />
            )}
            Exportar Todo
            </button>
        </div>
        </div>

      {error && (
        <div className="error-message">
          <AlertCircle />
          <p>{error}</p>
        </div>
      )}

      {alumnos.length === 0 ? (
        <div className="no-alumnos">
          <Users />
          <h3>No tienes alumnos registrados</h3>
          <p>No hay alumnos disponibles para gestionar observaciones</p>
        </div>
      ) : (
        <div className="cursos-container">
          {cursosConAlumnos.map((curso) => {
            const filteredAlumnos = filterAlumnos(curso.alumnos, curso.searchTerm);
            
            return (
              <div key={curso.id} className="curso-card">
                <div className="curso-header" onClick={() => toggleCursoExpansion(curso.id)}>
  <div className="curso-info">
    <div className="curso-icon"><School /></div>
    <div className="curso-details">
      <h3>{curso.nombre}</h3>
      <span className="alumnos-count">
        {curso.alumnos.length} alumno{curso.alumnos.length !== 1 ? 's' : ''}
      </span>
    </div>
  </div>
  <div className="curso-actions">
    <button
      onClick={(e) => {
        e.stopPropagation();
        exportarCursoAWord(curso);
      }}
      className="btn-export-curso"
      disabled={exportingWord[curso.id] || !tieneObservacionesParaExportar(curso.alumnos)}
      title={
        !tieneObservacionesParaExportar(curso.alumnos) 
          ? "No hay observaciones para exportar en este curso"
          : "Exportar observaciones del curso a Word"
      }
    >
      {exportingWord[curso.id] ? (
        <div className="spinner-small"></div>
      ) : (
        <Download />
      )}
      Exportar
    </button>
    <div className="curso-toggle">
      {curso.expanded ? <ChevronDown /> : <ChevronRight />}
    </div>
  </div>
</div>
                
                {curso.expanded && (
                  <div className="curso-alumnos">
                    <SearchBar
                      value={curso.searchTerm}
                      onChange={(value) => updateCursoSearchTerm(curso.id, value)}
                      placeholder={`Buscar alumno en ${curso.nombre}...`}
                    />
                    
                    <div className="search-results-info">
                      {curso.searchTerm && (
                        <p className="search-results-text">
                          {filteredAlumnos.length === 0 
                            ? 'No se encontraron alumnos' 
                            : `${filteredAlumnos.length} de ${curso.alumnos.length} alumno${filteredAlumnos.length !== 1 ? 's' : ''}`
                          }
                        </p>
                      )}
                    </div>
                    
                    <div className="alumnos-grid">
                      {filteredAlumnos.length > 0 ? (
                        filteredAlumnos.map((alumno) => (
                          <AlumnoObservacionCard 
                            key={alumno.id} 
                            alumno={alumno}
                            isEditing={editingObservations[alumno.id!] || false}
                            isSaving={savingObservations[alumno.id!] || false}
                            observaciones={observationsForm[alumno.id!] || ''}
                            onStartEditing={startEditingObservations}
                            onSaveObservations={saveObservations}
                            onCancelEditing={cancelEditingObservations}
                            onUpdateObservations={updateObservations}
                          />
                        ))
                      ) : curso.searchTerm ? (
                        <div className="no-search-results">
                          <Search />
                          <p>No se encontraron alumnos con el término "{curso.searchTerm}"</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {alumnosSinCurso.length > 0 && (
            <div className="curso-card sin-curso">
              <div className="curso-header">
                <div className="curso-info">
                  <div className="curso-icon warning"><AlertCircle /></div>
                  <div className="curso-details">
                    <h3>Alumnos sin curso asignado</h3>
                    <span className="alumnos-count">
                      {alumnosSinCurso.length} alumno{alumnosSinCurso.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="curso-alumnos">
                <SearchBar
                  value={searchTermSinCurso}
                  onChange={setSearchTermSinCurso}
                  placeholder="Buscar alumno sin curso..."
                />
                
                <div className="search-results-info">
                  {searchTermSinCurso && (
                    <p className="search-results-text">
                      {filterAlumnos(alumnosSinCurso, searchTermSinCurso).length === 0 
                        ? 'No se encontraron alumnos' 
                        : `${filterAlumnos(alumnosSinCurso, searchTermSinCurso).length} de ${alumnosSinCurso.length} alumno${filterAlumnos(alumnosSinCurso, searchTermSinCurso).length !== 1 ? 's' : ''}`
                      }
                    </p>
                  )}
                </div>
                
                <div className="alumnos-grid">
                  {filterAlumnos(alumnosSinCurso, searchTermSinCurso).length > 0 ? (
                    filterAlumnos(alumnosSinCurso, searchTermSinCurso).map((alumno) => (
                      <AlumnoObservacionCard 
                        key={alumno.id} 
                        alumno={alumno}
                        isEditing={editingObservations[alumno.id!] || false}
                        isSaving={savingObservations[alumno.id!] || false}
                        observaciones={observationsForm[alumno.id!] || ''}
                        onStartEditing={startEditingObservations}
                        onSaveObservations={saveObservations}
                        onCancelEditing={cancelEditingObservations}
                        onUpdateObservations={updateObservations}
                      />
                    ))
                  ) : searchTermSinCurso ? (
                    <div className="no-search-results">
                      <Search />
                      <p>No se encontraron alumnos con el término "{searchTermSinCurso}"</p>
                    </div>
                  ) : (
                    alumnosSinCurso.map((alumno) => (
                      <AlumnoObservacionCard 
                        key={alumno.id} 
                        alumno={alumno}
                        isEditing={editingObservations[alumno.id!] || false}
                        isSaving={savingObservations[alumno.id!] || false}
                        observaciones={observationsForm[alumno.id!] || ''}
                        onStartEditing={startEditingObservations}
                        onSaveObservations={saveObservations}
                        onCancelEditing={cancelEditingObservations}
                        onUpdateObservations={updateObservations}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlumnosObservaciones;