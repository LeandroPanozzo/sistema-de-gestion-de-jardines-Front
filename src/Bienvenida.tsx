import React from 'react';
import { GraduationCap, Users, BookOpen, Star } from 'lucide-react';
import './Bienvenida.css';

interface BienvenidaProps {
  onLogin: () => void;
  onRegister: () => void;
}

const Bienvenida: React.FC<BienvenidaProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="bienvenida-container">
      {/* Header decorativo */}
      <div className="decorative-bg">
        <div className="decorative-circle"></div>
        <div className="decorative-circle"></div>
        <div className="decorative-circle"></div>
        <div className="decorative-circle"></div>
      </div>

      <div className="bienvenida-content">
        <div className="welcome-card">
          {/* Logo/Icono principal */}
          <div className="main-logo">
            <div className="logo-circle">
              <GraduationCap />
            </div>
          </div>

          {/* Título principal */}
          <h1 className="main-title">
            ¡Bienvenido!
          </h1>
          
          <h2 className="subtitle">
            Sistema de Gestión Escolar
          </h2>

          {/* Descripción */}
          <p className="description">
            Plataforma integral para la administración educativa. Gestiona estudiantes, maestros, 
            pagos y más de manera eficiente y moderna.
          </p>

          {/* Características destacadas */}
          <div className="features-grid">
            <div className="feature-card blue">
              <Users className="feature-icon blue" />
              <h3 className="feature-title">Gestión de Usuarios</h3>
              <p className="feature-description">Administra maestros, directivos y estudiantes</p>
            </div>
            
            <div className="feature-card indigo">
              <BookOpen className="feature-icon indigo" />
              <h3 className="feature-title">Control Académico</h3>
              <p className="feature-description">Seguimiento, progreso y seguridad</p>
            </div>
            
            <div className="feature-card purple">
              <Star className="feature-icon purple" />
              <h3 className="feature-title">Reportes Avanzados</h3>
              <p className="feature-description">Estadísticas y análisis detallados</p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="action-buttons">
            <button
              onClick={onLogin}
              className="btn-primary"
            >
              Iniciar Sesión
            </button>
            
            <button
              onClick={onRegister}
              className="btn-secondary"
            >
              Registrarse
            </button>
          </div>

          {/* Nota informativa */}
          <div className="info-note">
            <p>
              <strong>Nota:</strong> Después del registro, un administrador debe habilitar tu cuenta 
              para acceder como maestro o directivo.
            </p>
          </div>

          {/* Footer */}
          <div className="welcome-footer">
            <p>
              © 2025 Sistema de Gestión Escolar. Hecho por Leandro Panozzo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bienvenida;