import React from 'react';
import { User, School, LogOut } from 'lucide-react';
import { authAPI, clearAuthToken } from './config/api';
import './header.css';

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  es_maestro: boolean;
  es_directivo: boolean;
}

interface HeaderProps {
  user: UserData;
  onLogout?: () => void;
  onUserClick?: () => void; // Nueva prop para manejar click en usuario
   onLogoClick?: () => void; // Nueva prop para manejar click en logo
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onUserClick, onLogoClick }) => {
  // Manejar logout
  const handleLogout = async () => {
    try {
      // Intentar hacer logout en el servidor
      await authAPI.logout();
    } catch (error) {
      console.warn('Error al hacer logout en el servidor:', error);
      // Continuar con el logout local incluso si falla el servidor
    } finally {
      // Limpiar token local
      clearAuthToken();

      // Llamar al callback de logout
      if (onLogout) {
        onLogout();
      }
    }
  };
  const handleLogoClick = () => {
      if (onLogoClick) {
        onLogoClick();
      }
    };
  // Manejar click en nombre de usuario
  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick();
    }
  };

  return (
    <header className="home-header">
      <div className="header-content">
        <div 
          className="logo-section clickable" 
          onClick={handleLogoClick}
          title="Ir a inicio"
        >
          <School className="logo-icon" />
          <div className="logo-text">
            <h1>Sistema de Gestión Escolar</h1>
            <p>Jardín de Infantes</p>
          </div>
        </div>

        <div className="user-section">
          <div 
            className="user-info clickable" 
            onClick={handleUserClick}
            title="Editar perfil"
          >
            <User className="user-icon" />
            <span>
              {user.first_name} {user.last_name}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="logout-btn"
          >
            <LogOut />
            Salir
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;