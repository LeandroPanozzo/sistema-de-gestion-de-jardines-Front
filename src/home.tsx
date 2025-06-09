import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, School, Settings, Users, BookOpen, Calendar, Clock, ClipboardList, BarChart3, GraduationCap, UserCheck } from 'lucide-react';
import './Home.css';

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  es_maestro: boolean;
  es_directivo: boolean;
}

interface HomeProps {
  user: UserData;
  onLogout?: () => void;
}

const Home: React.FC<HomeProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // Determinar el saludo basado en el rol
  const getSaludo = () => {
    if (user.es_directivo) {
      return "Hola Directivo";
    } else if (user.es_maestro) {
      return "Hola Maestra";
    } else {
      return "Hola Usuario";
    }
  };

  // Opciones del menú según el rol
  const getMenuOptions = () => {
    const baseOptions = [];

    // Opciones compartidas entre directivos y maestros
    if (user.es_directivo || user.es_maestro) {
      baseOptions.push(
        { 
          icon: Clock, 
          label: "Mi asistencia", 
          description: "Colocar mi asistencias",
          action: () => navigate('/MiAsistencia')
        },
        { 
          icon: GraduationCap, 
          label: "Mis Alumnos", 
          description: "Ver alumnos de mis cursos",
          action: () => navigate('/mis-alumnos')
        },
        { 
          icon: BookOpen, 
          label: "Mis Cursos", 
          description: "Ver cursos asignados",
          action: () => navigate('/mis-cursos')
        },
        { 
          icon: ClipboardList, 
          label: "Asistencia de Alumnos", 
          description: "Ver asistencia de alumnos",
          action: () => navigate('/Asistencia')
        }
      );
    }

    // Opciones para maestros (incluye maestros que también son directivos)
    if (user.es_directivo) {
      baseOptions.push(
        { 
          icon: UserCheck, 
          label: "consultar a la IA", 
          description: "hacer preguntas a la ia sobre diversos temas",
          action: () => navigate('/consultaIA')
        }
      );
    }

    // Opciones exclusivas para directivos
    if (user.es_directivo) {
      baseOptions.push(
        { 
          icon: Users, 
          label: "Registrar asistencia", 
          description: "Administrar asistencia de maestros y personal",
          action: () => navigate('/registrar-asistencias')
        },
        { 
          icon: BarChart3, 
          label: "Estadísticas", 
          description: "Ver estadísticas generales",
          action: () => navigate('/estadisticasGeneral')
        },
        { 
          icon: Calendar, 
          label: "Ciclos Lectivos", 
          description: "Administrar períodos académicos",
          action: () => navigate('/ciclos-lectivos')
        },
        { 
          icon: Settings, 
          label: "registro de pagos", 
          description: "ver los pagos de este mes",
          action: () => navigate('/pagos')
        }
      );
    }

    return baseOptions;
  };

  const menuOptions = getMenuOptions();

  return (
    <div className="home-container">
      {/* Main Content */}
      <main className="main-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-avatar">
            {user.es_directivo ? (
              <Settings />
            ) : (
              <User />
            )}
          </div>
          
          <h2 className="welcome-title">
            {getSaludo()}
          </h2>
          
          <p className="welcome-subtitle">
            {user.first_name} {user.last_name}
          </p>
          
          <div className="role-badges">
            {user.es_directivo && (
              <span className="role-badge directivo">
                Directivo
              </span>
            )}
            {user.es_maestro && (
              <span className="role-badge maestro">
                Maestro/a
              </span>
            )}
          </div>
        </div>

        {/* Menu Options */}
        {menuOptions.length > 0 && (
          <div className="menu-grid">
            {menuOptions.map((option, index) => {
              const IconComponent = option.icon;
              return (
                <div
                  key={index}
                  onClick={option.action}
                  className="menu-card"
                >
                  <div className="menu-card-icon">
                    <IconComponent />
                  </div>
                  
                  <h3>
                    {option.label}
                  </h3>
                  
                  <p>
                    {option.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Section for users without roles */}
        {!user.es_maestro && !user.es_directivo && (
          <div className="pending-account">
            <div className="pending-avatar">
              <User />
            </div>
            <h3>
              Cuenta Pendiente de Habilitación
            </h3>
            <p>
              Tu cuenta ha sido creada exitosamente, pero aún no ha sido habilitada por un administrador. 
              Contacta al directivo para obtener los permisos necesarios y acceder a las funcionalidades del sistema.
            </p>
          </div>
        )}

        {/* Current Date */}
        <div className="current-date">
          <p>
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Home;