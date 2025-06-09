import React, { useState } from 'react';
import { BarChart3, Users, GraduationCap, TrendingUp, BookOpen, Clock, Calendar, Shield, AlertTriangle } from 'lucide-react';
import EstadisticasMaestros from './estadisticasMaestro';
import EstadisticasAlumnoComponent from './EstadisticasAlumno';
import './Estadisticas.css';

// Interface para las props del componente
interface EstadisticasProps {
  user: any;
  onBack?: () => void;
}

// Tipos de vista disponibles
type VistaEstadisticas = 'principal' | 'maestros' | 'alumnos';

const Estadisticas: React.FC<EstadisticasProps> = ({ user, onBack }) => {
  const [vistaActual, setVistaActual] = useState<VistaEstadisticas>('principal');

  // Verificar si el usuario tiene permisos para ver estadísticas
  const tieneAccesoEstadisticas = user?.es_directivo || false;

  // Si el usuario no tiene acceso, mostrar mensaje de acceso denegado
  if (!tieneAccesoEstadisticas) {
    return (
      <div className="estadisticas-container">
        <div className="estadisticas-content">
          {/* Header de acceso denegado */}
          <div className="estadisticas-header">
            <div className="header-icon" style={{ color: '#e74c3c' }}>
              <Shield size={48} />
            </div>
            <h1 className="estadisticas-title">
              Acceso Restringido
            </h1>
            <p className="estadisticas-subtitle">
              No tienes permisos para acceder a las estadísticas
            </p>
          </div>

          {/* Mensaje de información */}
          <div className="user-info-card" style={{ borderColor: '#e74c3c', backgroundColor: '#fff5f5' }}>
            <div className="user-info-content">
              <div className="user-avatar" style={{ color: '#e74c3c' }}>
                <AlertTriangle size={24} />
              </div>
              <div className="user-details">
                <h3>Permisos insuficientes</h3>
                <p>{user?.first_name} {user?.last_name}</p>
                <span className="user-role" style={{ color: '#e74c3c' }}>
                  {user?.es_maestro ? 'Maestro' : 'Usuario'}
                </span>
              </div>
            </div>
          </div>

          {/* Información sobre permisos */}
          <div className="info-adicional">
            <div className="info-card" style={{ borderColor: '#f39c12', backgroundColor: '#fffbf0' }}>
              <div className="info-icon" style={{ color: '#f39c12' }}>
                <Shield size={32} />
              </div>
              <div className="info-content">
                <h3>Acceso Restringido</h3>
                <p>
                  Las estadísticas solo están disponibles para usuarios con rol de directivo. 
                  Si necesitas acceso a esta funcionalidad, contacta al administrador del sistema.
                </p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">
                <Users size={32} />
              </div>
              <div className="info-content">
                <h3>Roles del Sistema</h3>
                <p>
                  <strong>Maestro:</strong> Registro de asistencia y gestión de alumnos<br/>
                  <strong>Directivo:</strong> Acceso completo incluyendo estadísticas<br/>
                  <strong>Administrador:</strong> Gestión total del sistema
                </p>
              </div>
            </div>
          </div>

          {/* Botón de regreso */}
          {onBack && (
            <div className="footer-actions">
              <button onClick={onBack} className="back-button secondary">
                Volver al menú principal
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Función para manejar la navegación
  const navegarA = (vista: VistaEstadisticas) => {
    setVistaActual(vista);
  };

  // Función para volver a la vista principal
  const volverAPrincipal = () => {
    setVistaActual('principal');
  };

  // Si estamos en vista de maestros, mostrar ese componente
  if (vistaActual === 'maestros') {
    return (
      <EstadisticasMaestros 
        user={user} 
        onBack={volverAPrincipal}
      />
    );
  }

  // Si estamos en vista de alumnos, mostrar ese componente
  if (vistaActual === 'alumnos') {
    return (
      <EstadisticasAlumnoComponent 
        user={user} 
        onBack={volverAPrincipal}
      />
    );
  }

  // Vista principal con selector de estadísticas (solo para directivos)
  return (
    <div className="estadisticas-container">
      <div className="estadisticas-content">
        {/* Header principal */}
        <div className="estadisticas-header">
          <div className="header-icon">
            <BarChart3 size={48} />
          </div>
          <h1 className="estadisticas-title">
            Centro de Estadísticas
          </h1>
          <p className="estadisticas-subtitle">
            Selecciona el tipo de estadísticas que deseas visualizar
          </p>
        </div>

        {/* Información del usuario */}
        <div className="user-info-card">
          <div className="user-info-content">
            <div className="user-avatar">
              <Users size={24} />
            </div>
            <div className="user-details">
              <h3>Usuario activo</h3>
              <p>{user?.first_name} {user?.last_name}</p>
              <span className="user-role">
                {user?.es_directivo && user?.es_maestro ? 'Directivo y Maestro' : 
                 user?.es_directivo ? 'Directivo' : 'Administrador'}
              </span>
            </div>
          </div>
        </div>

        {/* Opciones de estadísticas */}
        <div className="opciones-grid">
          {/* Estadísticas de Alumnos */}
          <div className="opcion-card alumnos">
            <div className="opcion-content">
              <div className="opcion-icon">
                <GraduationCap size={64} />
              </div>
              <div className="opcion-info">
                <h2>Estadísticas de Alumnos</h2>
                <p>
                  Visualiza datos detallados sobre la asistencia de los estudiantes, 
                  incluyendo porcentajes por curso, tendencias temporales y análisis individual.
                </p>
                <ul className="caracteristicas-lista">
                  <li>
                    <Calendar size={16} />
                    Asistencia por período
                  </li>
                  <li>
                    <BookOpen size={16} />
                    Estadísticas por curso
                  </li>
                  <li>
                    <TrendingUp size={16} />
                    Tendencias temporales
                  </li>
                  <li>
                    <Users size={16} />
                    Análisis individual
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => navegarA('alumnos')}
                className="opcion-button alumnos"
              >
                <GraduationCap size={20} />
                Ver Estadísticas de Alumnos
              </button>
            </div>
          </div>

          {/* Estadísticas de Maestros */}
          <div className="opcion-card maestros">
            <div className="opcion-content">
              <div className="opcion-icon">
                <Users size={64} />
              </div>
              <div className="opcion-info">
                <h2>Estadísticas de Maestros</h2>
                <p>
                  Analiza la asistencia y puntualidad de los docentes, con métricas 
                  de horas trabajadas, porcentajes de asistencia y detalles por período.
                </p>
                <ul className="caracteristicas-lista">
                  <li>
                    <Clock size={16} />
                    Horarios y puntualidad
                  </li>
                  <li>
                    <BarChart3 size={16} />
                    Porcentajes de asistencia
                  </li>
                  <li>
                    <Calendar size={16} />
                    Filtros por período
                  </li>
                  <li>
                    <BookOpen size={16} />
                    Análisis por curso
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => navegarA('maestros')}
                className="opcion-button maestros"
              >
                <Users size={20} />
                Ver Estadísticas de Maestros
              </button>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="info-adicional">
          <div className="info-card">
            <div className="info-icon">
              <TrendingUp size={32} />
            </div>
            <div className="info-content">
              <h3>Análisis Avanzado</h3>
              <p>
                Todas las estadísticas incluyen gráficos interactivos, filtros por período 
                y exportación de datos para análisis más profundos.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">
              <Calendar size={32} />
            </div>
            <div className="info-content">
              <h3>Filtros Temporales</h3>
              <p>
                Filtra los datos por semana, mes o año para obtener insights 
                específicos según el período que necesites analizar.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">
              <BarChart3 size={32} />
            </div>
            <div className="info-content">
              <h3>Visualización Clara</h3>
              <p>
                Gráficos de barras, líneas de tendencia y tablas detalladas 
                para una comprensión completa de los datos de asistencia.
              </p>
            </div>
          </div>
        </div>

        {/* Footer con botón de regreso si existe */}
        {onBack && (
          <div className="footer-actions">
            <button onClick={onBack} className="back-button secondary">
              Volver al menú principal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Estadisticas;