import React from 'react';
import './footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p>
          Creado por{' '}
          <a 
            href="https://leandropanozzo.github.io/Portafolio-Leandro-Panozzo/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="creator-link"
          >
            Leandro Panozzo (click para mas informacion)
          </a>{' '}
          © {currentYear} - Todos los derechos reservados
        </p>
      </div>
    </footer>
  );
};

export default Footer;