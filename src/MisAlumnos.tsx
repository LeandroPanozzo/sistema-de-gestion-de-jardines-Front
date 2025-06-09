import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  User, Plus, Edit3, Trash2, Save, X, UserPlus, School, Phone, Calendar, 
  Users, AlertCircle, BookOpen, ChevronDown, ChevronRight, Search
} from 'lucide-react';
import { alumnoAPI, familiarAPI, cursoAPI, handleAPIError } from './config/api';
import './MisAlumnos.css';

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

interface MisAlumnosProps {
  user: UserData;
  onBack: () => void;
}

const RELACIONES_FAMILIARES = [
  { value: 'padre', label: 'Padre' },
  { value: 'madre', label: 'Madre' },
  { value: 'abuelo', label: 'Abuelo' },
  { value: 'abuela', label: 'Abuela' },
  { value: 'ti@', label: 'Tí@' },
  { value: 'herman@', label: 'Herman@' },
  { value: 'otro', label: 'Otro' }
];
 // Componente SearchBar memoizado para mantener el foco
  const SearchBar = ({ 
  value, 
  onChange, 
  placeholder, 
  autoFocus = false 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string;
  autoFocus?: boolean;
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

// Agregar este nuevo useEffect para mantener el foco
useEffect(() => {
  if (autoFocus && inputRef.current) {
    inputRef.current.focus();
  }
}, []);  // Solo ejecutar una vez al montar

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    }, [onChange]);

    const handleClear = useCallback(() => {
      onChange('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, [onChange]);

    return (
      <div className="search-bar">
        <div className="search-input-container">
          <Search className="search-icon" />
          <input
            ref={inputRef}
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
  const FormField = ({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div className="form-group">
      <label>{label} {required && '*'}</label>
      {children}
    </div>
  );
const MisAlumnos: React.FC<MisAlumnosProps> = ({ user, onBack }) => {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursosConAlumnos, setCursosConAlumnos] = useState<CursoConAlumnos[]>([]);
  const [alumnosSinCurso, setAlumnosSinCurso] = useState<Alumno[]>([]);
  const [searchTermSinCurso, setSearchTermSinCurso] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  const [editingFamiliar, setEditingFamiliar] = useState<Familiar | null>(null);
  const [showFamiliarModal, setShowFamiliarModal] = useState(false);
  const [selectedAlumnoForFamiliar, setSelectedAlumnoForFamiliar] = useState<Alumno | null>(null);
  const [formAlumno, setFormAlumno] = useState<Alumno>({
    nombre: '', apellido: '', dni: '', fecha_nacimiento: '', curso: null
  });

  const [formFamiliar, setFormFamiliar] = useState<Familiar>({
    nombre: '', apellido: '', dni: '', telefono: '', direccion: '', mail: '', relacion_con_alumno: 'padre'
  });

  useEffect(() => {
    if (!user.es_maestro) {
      setError('No tienes permisos para acceder a esta sección');
      return;
    }
    loadData();
  }, [user]);

  useEffect(() => {
    groupAlumnosByCurso();
  }, [alumnos, cursos]);

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
    const cursosConAlumnosData: CursoConAlumnos[] = cursos.map(curso => {
      // Mantener el searchTerm existente si ya existe
      const existingCurso = cursosConAlumnos.find(c => c.id === curso.id);
      return {
        ...curso,
        alumnos: sortAlumnosAlphabetically(alumnos.filter(alumno => alumno.curso === curso.id)),
        expanded: existingCurso?.expanded || false,
        searchTerm: existingCurso?.searchTerm || ''
      };
    });

    setCursosConAlumnos(cursosConAlumnosData.filter(curso => curso.alumnos.length > 0));
    setAlumnosSinCurso(sortAlumnosAlphabetically(alumnos.filter(alumno => !alumno.curso)));
  }, [alumnos, cursos, cursosConAlumnos, sortAlumnosAlphabetically]);

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
    
    const [alumnosResponse, cursosResponse] = await Promise.all([
      alumnoAPI.misAlumnos(),
      cursoAPI.misCursos()
    ]);
    
    // Los alumnos ya vienen con sus familiares desde el backend
    setAlumnos(alumnosResponse.data);
    setCursos(cursosResponse.data);
    
  } catch (error: any) {
    const apiError = handleAPIError(error);
    setError(apiError.message);
    console.error('Error cargando datos:', error);
  } finally {
    setLoading(false);
  }
};

  const resetForm = () => {
    setFormAlumno({ nombre: '', apellido: '', dni: '', fecha_nacimiento: '', curso: null });
    setFormFamiliar({ nombre: '', apellido: '', dni: '', telefono: '', direccion: '', mail: '', relacion_con_alumno: 'padre' });
    setSelectedAlumno(null);
    setEditingFamiliar(null);
  };

  const openCreateModal = () => {
    if (cursos.length === 0) {
      setError('Debes crear un curso primero antes de poder agregar alumnos');
      return;
    }
    resetForm();
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (alumno: Alumno) => {
    setFormAlumno({
      ...alumno,
      fecha_nacimiento: alumno.fecha_nacimiento ? 
  (alumno.fecha_nacimiento.includes('T') ? 
    alumno.fecha_nacimiento.split('T')[0] : 
    alumno.fecha_nacimiento) : ''
    });
    
    if (alumno.familiares && alumno.familiares.length > 0) {
      setFormFamiliar(alumno.familiares[0]);
      setEditingFamiliar(alumno.familiares[0]);
    }
    
    setSelectedAlumno(alumno);
    setModalMode('edit');
    setShowModal(true);
  };
  const openAddFamiliarModal = (alumno: Alumno) => {
  setFormFamiliar({ 
    nombre: '', apellido: '', dni: '', telefono: '', direccion: '', mail: '', relacion_con_alumno: 'padre' 
  });
  setSelectedAlumnoForFamiliar(alumno);
  setShowFamiliarModal(true);
};

const closeFamiliarModal = () => {
  setShowFamiliarModal(false);
  setSelectedAlumnoForFamiliar(null);
  setError(null);
};
  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      if (!formAlumno.nombre.trim() || !formAlumno.apellido.trim() || !formAlumno.dni.trim()) {
        setError('Nombre, apellido y DNI del alumno son obligatorios');
        return;
      }
      
      if (!formFamiliar.nombre.trim() || !formFamiliar.apellido.trim() || !formFamiliar.dni.trim()) {
        setError('Nombre, apellido y DNI del familiar son obligatorios');
        return;
      }

      if (modalMode === 'create') {
        const alumnoResponse = await alumnoAPI.create(formAlumno);
        const nuevoAlumno = alumnoResponse.data;
        
        const familiarData = { ...formFamiliar, alumno: nuevoAlumno.id };
        const familiarResponse = await familiarAPI.create(familiarData);
        
        const alumnoConFamiliar = { ...nuevoAlumno, familiares: [familiarResponse.data] };
        setAlumnos(prev => [...prev, alumnoConFamiliar]);
        
      } else {
        if (selectedAlumno) {
          const alumnoResponse = await alumnoAPI.update(selectedAlumno.id!, formAlumno);
          
          if (editingFamiliar && editingFamiliar.id) {
            const familiarResponse = await familiarAPI.update(editingFamiliar.id, formFamiliar);
            
            setAlumnos(prev => prev.map(alumno => 
              alumno.id === selectedAlumno.id 
                ? { ...alumnoResponse.data, familiares: [familiarResponse.data] }
                : alumno
            ));
          }
        }
      }
      
      closeModal();
      
    } catch (error: any) {
      const apiError = handleAPIError(error);
      setError(apiError.message);
      console.error('Error guardando datos:', error);
    }
  };

  const handleDelete = async (alumno: Alumno) => {
    if (!window.confirm(`¿Estás segura de que quieres eliminar a ${alumno.nombre} ${alumno.apellido}?`)) {
      return;
    }
    
    try {
      setError(null);
      
      if (alumno.familiares) {
        for (const familiar of alumno.familiares) {
          if (familiar.id) {
            await familiarAPI.delete(familiar.id);
          }
        }
      }
      
      await alumnoAPI.delete(alumno.id!);
      setAlumnos(prev => prev.filter(a => a.id !== alumno.id));
      
    } catch (error: any) {
      const apiError = handleAPIError(error);
      setError(apiError.message);
      console.error('Error eliminando alumno:', error);
    }
  };
  const handleCreateFamiliar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      if (!formFamiliar.nombre.trim() || !formFamiliar.apellido.trim() || !formFamiliar.dni.trim()) {
        setError('Nombre, apellido y DNI del familiar son obligatorios');
        return;
      }

      if (selectedAlumnoForFamiliar) {
        const familiarData = { ...formFamiliar, alumno: selectedAlumnoForFamiliar.id };
        const familiarResponse = await familiarAPI.create(familiarData);
        
        // Actualizar el alumno agregando el nuevo familiar
        setAlumnos(prev => prev.map(alumno => 
          alumno.id === selectedAlumnoForFamiliar.id 
            ? { ...alumno, familiares: [...(alumno.familiares || []), familiarResponse.data] }
            : alumno
        ));
        
        closeFamiliarModal();
      }
      
    } catch (error: any) {
      const apiError = handleAPIError(error);
      setError(apiError.message);
      console.error('Error creando familiar:', error);
    }
  };
  const handleDeleteFamiliar = async (familiar: Familiar, alumno: Alumno) => {
  // Verificar si es el último familiar
  if (alumno.familiares && alumno.familiares.length <= 1) {
    setError('No se puede eliminar el último familiar. El alumno debe tener al menos un familiar responsable.');
    return;
  }

  if (!window.confirm(`¿Estás segura de que quieres eliminar a ${familiar.nombre} ${familiar.apellido} de los familiares de ${alumno.nombre}?`)) {
    return;
  }
  
  try {
    setError(null);
    
    if (familiar.id) {
      await familiarAPI.delete(familiar.id);
      
      // Actualizar el alumno removiendo el familiar eliminado
      setAlumnos(prev => prev.map(a => 
        a.id === alumno.id 
          ? { ...a, familiares: a.familiares?.filter(f => f.id !== familiar.id) || [] }
          : a
      ));
    }
    
  } catch (error: any) {
    const apiError = handleAPIError(error);
    setError(apiError.message);
    console.error('Error eliminando familiar:', error);
  }
};
  // Componente AlumnoCard memoizado para evitar re-renders innecesarios
  const AlumnoCard = React.memo(({ alumno }: { alumno: Alumno }) => (
    <div className="alumno-card">
      <div className="alumno-header">
        <div className="alumno-avatar"><User /></div>
        <div className="alumno-info">
          <h4>{alumno.nombre} {alumno.apellido}<br />DNI: {alumno.dni}</h4>
          {alumno.edad && <p className="edad">{alumno.edad} años</p>}
        </div>
        <div className="alumno-actions">
          <button onClick={() => openEditModal(alumno)} className="btn-edit" title="Editar alumno">
            <Edit3 />
          </button>
          <button onClick={() => openAddFamiliarModal(alumno)} className="btn-add-familiar" title="Agregar familiar">
            <UserPlus />
          </button>
          <button onClick={() => handleDelete(alumno)} className="btn-delete" title="Eliminar alumno">
            <Trash2 />
          </button>
        </div>
      </div>
      
      <div className="alumno-details">
        <div className="detail-item">
          <Calendar />
            <span>Nació: {new Date(alumno.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-AR')}</span>
        </div>
        
        {alumno.familiares && alumno.familiares.length > 0 && (
          <div className="familiares-section">
            <h5>Familiares:</h5>
            {alumno.familiares.map((familiar, index) => (
              <div key={index} className="familiar-info">
                <div className="familiar-data">
                  <strong>{familiar.nombre} {familiar.apellido}</strong>
                  <span className="relacion">({familiar.relacion_con_alumno})</span>
                  {familiar.telefono && (
                    <div className="contact-info">
                      <Phone />
                      <span>{familiar.telefono}</span>
                    </div>
                  )}
                </div>
                {familiar.id && (
                  <button 
                    onClick={() => handleDeleteFamiliar(familiar, alumno)}
                    className="btn-delete-familiar"
                    title="Eliminar familiar"
                    type="button"
                  >
                    <Trash2 />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ));

  if (!user.es_maestro) {
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
          <p>Cargando alumnos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mis-alumnos-container">
      <div className="header">
        <button onClick={onBack} className="btn-back"><X />Volver</button>
        <h1><BookOpen />Mis Alumnos</h1>
        <button onClick={openCreateModal} className="btn-primary"><Plus />Agregar Alumno</button>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle />
          <p>{error}</p>
        </div>
      )}

      {cursos.length === 0 && (
        <div className="no-courses-message">
          <School />
          <h3>No tienes cursos asignados</h3>
          <p>Para poder gestionar alumnos, primero debes tener cursos asignados. Contacta al directivo para que te asigne cursos.</p>
        </div>
      )}

      {cursos.length > 0 && (
        <div className="cursos-container">
          {cursosConAlumnos.length === 0 && alumnosSinCurso.length === 0 ? (
            <div className="no-alumnos">
              <Users />
              <h3>No tienes alumnos registrados</h3>
              <p>Agrega tu primer alumno haciendo clic en "Agregar Alumno"</p>
            </div>
          ) : (
            <>
              {cursosConAlumnos.map((curso) => {
                const filteredAlumnos = filterAlumnos(curso.alumnos, curso.searchTerm);
                
                return (
                  <div key={curso.id} className="curso-card">
                    <div className="curso-header" onClick={() => toggleCursoExpansion(curso.id)}>
                      <div className="curso-info">
                        <div className="curso-icon"><School /></div>
                        <div className="curso-details">
                          <h3>{curso.nombre}</h3>
                          <p>{curso.turno} • {curso.horario}</p>
                          <span className="alumnos-count">
                            {curso.alumnos.length} alumno{curso.alumnos.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="curso-toggle">
                        {curso.expanded ? <ChevronDown /> : <ChevronRight />}
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
                              <AlumnoCard key={alumno.id} alumno={alumno} />
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
                        <p>Estos alumnos necesitan ser asignados a un curso</p>
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
                          <AlumnoCard key={alumno.id} alumno={alumno} />
                        ))
                      ) : searchTermSinCurso ? (
                        <div className="no-search-results">
                          <Search />
                          <p>No se encontraron alumnos con el término "{searchTermSinCurso}"</p>
                        </div>
                      ) : (
                        alumnosSinCurso.map((alumno) => (
                          <AlumnoCard key={alumno.id} alumno={alumno} />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>
                {modalMode === 'create' ? <><UserPlus />Agregar Nuevo Alumno</> : <><Edit3 />Editar Alumno</>}
              </h2>
              <button onClick={closeModal} className="btn-close"><X /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-section">
                <h3>Datos del Alumno</h3>
                
                <div className="form-row">
                  <FormField label="Nombre" required>
                    <input
                      type="text"
                      value={formAlumno.nombre}
                      onChange={(e) => setFormAlumno(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                    />
                  </FormField>
                  
                  <FormField label="Apellido" required>
                    <input
                      type="text"
                      value={formAlumno.apellido}
                      onChange={(e) => setFormAlumno(prev => ({ ...prev, apellido: e.target.value }))}
                      required
                    />
                  </FormField>
                </div>
                
                <div className="form-row">
                  <FormField label="DNI" required>
                    <input
                      type="text"
                      value={formAlumno.dni}
                      onChange={(e) => setFormAlumno(prev => ({ ...prev, dni: e.target.value }))}
                      required
                    />
                  </FormField>
                  
                  <FormField label="Fecha de Nacimiento">
                    <input
                      type="date"
                      value={formAlumno.fecha_nacimiento}
                      onChange={(e) => setFormAlumno(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                      lang="es-AR"
                      placeholder="dd/mm/aaaa"
                    />
                  </FormField>
                </div>
                
                <FormField label="Curso">
                  <select
                    value={formAlumno.curso || ''}
                    onChange={(e) => setFormAlumno(prev => ({ ...prev, curso: e.target.value ? Number(e.target.value) : null }))}
                  >
                    <option value="">Sin curso asignado</option>
                    {cursos.map(curso => (
                      <option key={curso.id} value={curso.id}>
                        {curso.nombre} - {curso.turno} ({curso.cupos_disponibles} cupos disponibles)
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="form-section">
                <h3>Datos del Familiar Responsable</h3>
                
                <div className="form-row">
                  <FormField label="Nombre" required>
                    <input
                      type="text"
                      value={formFamiliar.nombre}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                    />
                  </FormField>
                  
                  <FormField label="Apellido" required>
                    <input
                      type="text"
                      value={formFamiliar.apellido}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, apellido: e.target.value }))}
                      required
                    />
                  </FormField>
                </div>
                
                <div className="form-row">
                  <FormField label="DNI" required>
                    <input
                      type="text"
                      value={formFamiliar.dni}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, dni: e.target.value }))}
                      required
                    />
                  </FormField>
                  
                  <FormField label="Relación">
                    <select
                      value={formFamiliar.relacion_con_alumno}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, relacion_con_alumno: e.target.value }))}
                    >
                      {RELACIONES_FAMILIARES.map(relacion => (
                        <option key={relacion.value} value={relacion.value}>
                          {relacion.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                
                <div className="form-row">
                  <FormField label="Teléfono">
                    <input
                      type="tel"
                      value={formFamiliar.telefono}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, telefono: e.target.value }))}
                    />
                  </FormField>
                  
                  <FormField label="Email">
                    <input
                      type="email"
                      value={formFamiliar.mail}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, mail: e.target.value }))}
                    />
                  </FormField>
                </div>
                
                <FormField label="Dirección">
                  <textarea
                    value={formFamiliar.direccion}
                    onChange={(e) => setFormFamiliar(prev => ({ ...prev, direccion: e.target.value }))}
                    rows={3}
                  />
                </FormField>
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle />
                  <p>{error}</p>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Save />
                  {modalMode === 'create' ? 'Crear Alumno' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showFamiliarModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2><UserPlus />Agregar Familiar a {selectedAlumnoForFamiliar?.nombre} {selectedAlumnoForFamiliar?.apellido}</h2>
              <button onClick={closeFamiliarModal} className="btn-close"><X /></button>
            </div>
            
            <form onSubmit={handleCreateFamiliar} className="modal-form">
              <div className="form-section">
                <h3>Datos del Familiar</h3>
                
                <div className="form-row">
                  <FormField label="Nombre" required>
                    <input
                      type="text"
                      value={formFamiliar.nombre}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                    />
                  </FormField>
                  
                  <FormField label="Apellido" required>
                    <input
                      type="text"
                      value={formFamiliar.apellido}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, apellido: e.target.value }))}
                      required
                    />
                  </FormField>
                </div>
                
                <div className="form-row">
                  <FormField label="DNI" required>
                    <input
                      type="text"
                      value={formFamiliar.dni}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, dni: e.target.value }))}
                      required
                    />
                  </FormField>
                  
                  <FormField label="Relación">
                    <select
                      value={formFamiliar.relacion_con_alumno}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, relacion_con_alumno: e.target.value }))}
                    >
                      {RELACIONES_FAMILIARES.map(relacion => (
                        <option key={relacion.value} value={relacion.value}>
                          {relacion.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                
                <div className="form-row">
                  <FormField label="Teléfono">
                    <input
                      type="tel"
                      value={formFamiliar.telefono}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, telefono: e.target.value }))}
                    />
                  </FormField>
                  
                  <FormField label="Email">
                    <input
                      type="email"
                      value={formFamiliar.mail}
                      onChange={(e) => setFormFamiliar(prev => ({ ...prev, mail: e.target.value }))}
                    />
                  </FormField>
                </div>
                
                <FormField label="Dirección">
                  <textarea
                    value={formFamiliar.direccion}
                    onChange={(e) => setFormFamiliar(prev => ({ ...prev, direccion: e.target.value }))}
                    rows={3}
                  />
                </FormField>
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle />
                  <p>{error}</p>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={closeFamiliarModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Save />
                  Agregar Familiar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default MisAlumnos;