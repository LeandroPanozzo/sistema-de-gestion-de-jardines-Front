import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Register from './Register';
import Login from './login';
import Bienvenida from './Bienvenida';
import Home from './home';
import Alumnos from './Alumnos';
import AlumnosObservaciones from './AlumnosObservaciones'; // Add this import
import CiclosLectivos from './CiclosLectivos';
import Header from './header';
import Footer from './footer';
import Asistencia from './Asistencia';
import MiAsistencia from './MiAsistencia';
import RegistrarAsistencias from './RegistrarAsistencias'
import MisCursos from './MisCursos';
import UsersPage from './users';
import PagosComponent from './Pagos';
import EstadisticasPagos from './EstadisticasPagos';
import Estadisticas from './estadisticas';
import Chatbot from './chatbotIA';
import HistorialAsistencias from './historialAsistencias';
import { getAuthToken, clearAuthToken, authAPI, UserData } from './config/api';

// Componente para hacer scroll al inicio en cada cambio de ruta
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Componente para rutas protegidas
const ProtectedRoute = ({ children, user }: { children: React.ReactNode, user: UserData | null }) => {
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Componente para rutas públicas (redirige a home si ya está logueado)
const PublicRoute = ({ children, user }: { children: React.ReactNode, user: UserData | null }) => {
  return !user ? <>{children}</> : <Navigate to="/home" replace />;
};

function AppContent() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoClick = () => {
    navigate('/home');
  };

  // Add the missing function
  const handleNavigateToObservaciones = () => {
    navigate('/alumnos-observaciones');
  };
  
  // Verificar si hay una sesión activa al cargar la aplicación
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = getAuthToken();
      
      if (token) {
        try {
          const response = await authAPI.getCurrentUser();
          setUser(response.data);
        } catch (error) {
          console.warn('Error verificando token:', error);
          clearAuthToken();
        }
      }
      
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const handleLoginSuccess = (userData: UserData) => {
    setUser(userData);
    navigate('/home');
  };

  const handleLogout = () => {
    setUser(null);
    clearAuthToken();
    navigate('/');
  };

  const handleUserClick = () => {
    navigate('/users');
  };

  // Determinar si mostrar el header
  const shouldShowHeader = () => {
    const currentPath = location.pathname;
    const excludedPaths = ['/login', '/register'];
    return user && !excludedPaths.includes(currentPath);
  };

  // Determinar si mostrar el footer (siempre visible excepto en carga)
  const shouldShowFooter = () => {
    return !isLoading;
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <ScrollToTop />
      
      {shouldShowHeader() && (
        <Header 
          user={user!} 
          onLogout={handleLogout}
          onUserClick={handleUserClick}
          onLogoClick={handleLogoClick}
        />
      )}
      
      <main style={{ flex: 1 }}>
        <Routes>
          {/* Ruta raíz - Bienvenida */}
          <Route 
            path="/" 
            element={
              <PublicRoute user={user}>
                <Bienvenida
                  onLogin={() => navigate('/login')}
                  onRegister={() => navigate('/register')}
                />
              </PublicRoute>
            } 
          />
          
          {/* Ruta de login */}
          <Route 
            path="/login" 
            element={
              <PublicRoute user={user}>
                <Login 
                  onGoToRegister={() => navigate('/register')}
                  onLoginSuccess={handleLoginSuccess}
                />
              </PublicRoute>
            } 
          />
          
          {/* Ruta de registro */}
          <Route 
            path="/register" 
            element={
              <PublicRoute user={user}>
                <Register onGoToLogin={() => navigate('/login')} />
              </PublicRoute>
            } 
          />
          
          {/* Ruta de home protegida */}
          <Route 
            path="/home" 
            element={
              <ProtectedRoute user={user}>
                <Home 
                  user={user!} 
                  onLogout={handleLogout}
                />
              </ProtectedRoute>
            } 
          />
          
          {/* Nueva ruta de usuarios/perfil protegida */}
          <Route 
            path="/users" 
            element={
              <ProtectedRoute user={user}>
                <UsersPage 
                  user={user!} 
                  onBack={() => navigate(-1)}
                />
              </ProtectedRoute>
            } 
          />
          
          {/* Ruta de mis alumnos protegida */}
          <Route 
            path="/alumnos" 
            element={
              <ProtectedRoute user={user}>
                <Alumnos 
                  user={user!} 
                  onBack={() => navigate('/home')}
                  onNavigateToObservaciones={handleNavigateToObservaciones}
                />
              </ProtectedRoute>
            } 
          />

          {/* Nueva ruta para observaciones de alumnos */}
          <Route 
            path="/alumnos-observaciones" 
            element={
              <ProtectedRoute user={user}>
                <AlumnosObservaciones 
                  user={user!} 
                  onBack={() => navigate('/alumnos')}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/registrar-asistencias" 
            element={
              <ProtectedRoute user={user}>
                <RegistrarAsistencias 
                  user={user!} 
                  onBack={() => navigate('/home')}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/pagos" 
            element={
              <ProtectedRoute user={user}>
                <PagosComponent 
                  user={user!} 
                  onBack={() => navigate('/home')}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/estadisticasPagos" 
            element={
              <ProtectedRoute user={user}>
                <EstadisticasPagos 
                  user={user!} 
                  onBack={() => navigate('/home')}
                />
              </ProtectedRoute>
            } 
          />
          
          {/* RUTA DE ASISTENCIA MODIFICADA - AHORA CON NAVEGACIÓN AL HISTORIAL */}
          <Route 
            path="/asistencia" 
            element={
              <ProtectedRoute user={user}>
                <Asistencia 
                  user={user!} 
                  onBack={() => navigate('/home')}
                  onNavigateToHistorial={() => navigate('/historial-asistencias')}
                />
              </ProtectedRoute>
            } 
          />
          
          {/* NUEVA RUTA PARA EL HISTORIAL DE ASISTENCIAS */}
          <Route 
            path="/historial-asistencias" 
            element={
              <ProtectedRoute user={user}>
                <HistorialAsistencias 
                  user={user!} 
                  onBack={() => navigate('/asistencia')}
                />
              </ProtectedRoute>
            } 
          />
          
          {/* Nueva ruta de mis cursos protegida */}
          <Route 
            path="/mis-cursos" 
            element={
              <ProtectedRoute user={user}>
                <MisCursos 
                  user={user!} 
                  onNavigateBack={() => navigate('/home')}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/estadisticasGeneral" 
            element={
              <ProtectedRoute user={user}>
                <Estadisticas 
                  user={user!} 
                  onBack={() => navigate('/home')}
                />
              </ProtectedRoute>
            } 
          />
          
          {/* Ruta de ciclo lectivo protegida */}
          <Route 
            path="/ciclos-lectivos" 
            element={
              <ProtectedRoute user={user}>
                <CiclosLectivos
                  user={user!} 
                  onBack={() => navigate('/home')}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/MiAsistencia" 
            element={
              <ProtectedRoute user={user}>
                <MiAsistencia
                  user={user!} 
                  onBack={() => navigate('/home')}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/consultaIA" 
            element={
              <ProtectedRoute user={user}>
                <Chatbot
                  user={user!} 
                  onBack={() => navigate('/home')}
                />
              </ProtectedRoute>
            } 
          />
          
          {/* Ruta por defecto */}
          <Route 
            path="*" 
            element={<Navigate to={user ? "/home" : "/"} replace />} 
          />
        </Routes>
      </main>
      
      {shouldShowFooter() && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;