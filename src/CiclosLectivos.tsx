import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cicloLectivoAPI, handleAPIError } from './config/api';
import './CiclosLectivos.css';

interface CicloLectivo {
  id: number;
  inicio: string;
  finalizacion: string;
}

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  es_maestro: boolean;
  es_directivo: boolean;
}

interface CiclosLectivosProps {
  user: UserData;
  onBack: () => void; // Add this line

}

const CiclosLectivos: React.FC<CiclosLectivosProps> = ({ user}) => {
  const navigate = useNavigate();
  const [ciclos, setCiclos] = useState<CicloLectivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCiclo, setEditingCiclo] = useState<CicloLectivo | null>(null);
  const [formData, setFormData] = useState({
    inicio: '',
    finalizacion: ''
  });

  // Cargar ciclos lectivos al montar el componente
  useEffect(() => {
    fetchCiclos();
  }, []);

  const fetchCiclos = async () => {
    try {
      setLoading(true);
      const response = await cicloLectivoAPI.getAll();
      setCiclos(response.data);
      setError(null);
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
      console.error('Error al cargar ciclos lectivos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar fechas
    if (new Date(formData.inicio) >= new Date(formData.finalizacion)) {
      setError('La fecha de inicio debe ser anterior a la fecha de finalización');
      return;
    }

    try {
      setError(null);
      
      if (editingCiclo) {
        // Actualizar ciclo existente
        await cicloLectivoAPI.update(editingCiclo.id, formData);
      } else {
        // Crear nuevo ciclo
        await cicloLectivoAPI.create(formData);
      }
      
      // Recargar la lista y cerrar el formulario
      await fetchCiclos();
      resetForm();
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message);
      console.error('Error al guardar ciclo lectivo:', err);
    }
  };

  const handleEdit = (ciclo: CicloLectivo) => {
    setEditingCiclo(ciclo);
    setFormData({
      inicio: ciclo.inicio,
      finalizacion: ciclo.finalizacion
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este ciclo lectivo?')) {
      try {
        await cicloLectivoAPI.delete(id);
        await fetchCiclos();
      } catch (err: any) {
        const apiError = handleAPIError(err);
        setError(apiError.message);
        console.error('Error al eliminar ciclo lectivo:', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      inicio: '',
      finalizacion: ''
    });
    setEditingCiclo(null);
    setShowForm(false);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const getCicloYear = (inicio: string) => {
    return new Date(inicio).getFullYear();
  };

  if (loading) {
    return (
      <div className="ciclos-container">
        <div className="loading">
          <Calendar className="loading-icon" />
          <p>Cargando ciclos lectivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ciclos-container">
      {/* Header */}
      <div className="ciclos-header">
        <button 
          onClick={() => navigate('/')} 
          className="back-button"
        >
          <ArrowLeft />
          Volver al Inicio
        </button>
        
        <div className="header-content">
          <h1>
            <Calendar />
            Ciclos Lectivos
          </h1>
          
          <button 
            onClick={() => setShowForm(true)}
            className="add-button"
          >
            <Plus />
            Nuevo Ciclo Lectivo
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>
                {editingCiclo ? 'Editar Ciclo Lectivo' : 'Nuevo Ciclo Lectivo'}
              </h2>
              <button onClick={resetForm} className="close-button">
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="ciclo-form">
              <div className="form-group">
                <label htmlFor="inicio">Fecha de Inicio:</label>
                <input
                  type="date"
                  id="inicio"
                  value={formData.inicio}
                  onChange={(e) => setFormData({ ...formData, inicio: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="finalizacion">Fecha de Finalización:</label>
                <input
                  type="date"
                  id="finalizacion"
                  value={formData.finalizacion}
                  onChange={(e) => setFormData({ ...formData, finalizacion: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="submit-button">
                  {editingCiclo ? 'Actualizar' : 'Crear'} Ciclo Lectivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ciclos List */}
      <div className="ciclos-content">
        {ciclos.length === 0 ? (
          <div className="empty-state">
            <Calendar className="empty-icon" />
            <h3>No hay ciclos lectivos</h3>
            <p>Crea tu primer ciclo lectivo para comenzar a organizar los períodos académicos.</p>
            <button 
              onClick={() => setShowForm(true)}
              className="add-button-empty"
            >
              <Plus />
              Crear Primer Ciclo Lectivo
            </button>
          </div>
        ) : (
          <div className="ciclos-grid">
            {ciclos.map((ciclo) => (
              <div key={ciclo.id} className="ciclo-card">
                <div className="ciclo-header">
                  <h3>Ciclo {getCicloYear(ciclo.inicio)}</h3>
                  <div className="ciclo-actions">
                    <button 
                      onClick={() => handleEdit(ciclo)}
                      className="edit-button"
                      title="Editar"
                    >
                      <Edit />
                    </button>
                    <button 
                      onClick={() => handleDelete(ciclo.id)}
                      className="delete-button"
                      title="Eliminar"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
                
                <div className="ciclo-dates">
                  <div className="date-item">
                    <strong>Inicio:</strong>
                    <span>{formatDate(ciclo.inicio)}</span>
                  </div>
                  <div className="date-item">
                    <strong>Finalización:</strong>
                    <span>{formatDate(ciclo.finalizacion)}</span>
                  </div>
                </div>
                
                <div className="ciclo-status">
                  {new Date() >= new Date(ciclo.inicio) && new Date() <= new Date(ciclo.finalizacion) ? (
                    <span className="status-active">Activo</span>
                  ) : new Date() < new Date(ciclo.inicio) ? (
                    <span className="status-upcoming">Próximo</span>
                  ) : (
                    <span className="status-finished">Finalizado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CiclosLectivos;