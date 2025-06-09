import React, { useState, useEffect } from 'react';
import './Pagos.css';
import { 
  Users, DollarSign, Calendar, Check, X, ChevronDown, ChevronRight,
  User, BookOpen, ArrowLeft, Clock, AlertTriangle,BarChart3
} from 'lucide-react';
import { 
  alumnoAPI, cursoAPI, familiarAPI, pagoAPI, cuotaAPI,
  handleAPIError, UserData 
} from './config/api';
import ExportarPagos from './ExportarPagos';
import EstadisticasPagos from './EstadisticasPagos';
interface PagosComponentProps {
  user: UserData;
  onBack: () => void;
}

const Card = ({ children, className = "" }) => (
  <div className={`pagos-card ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = "" }) => (
  <div className={`pagos-card-header ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`pagos-card-content ${className}`}>{children}</div>
);

const mesesNombres = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const PagosComponent: React.FC<PagosComponentProps> = ({ user, onBack }) => {
  const [data, setData] = useState({
    alumnos: [], cursos: [], familiares: [], pagos: [], cuotas: []
  });
  const [ui, setUi] = useState({
  loading: true, error: '', expandedAlumno: null, expandedCurso: null,
  selectedYear: new Date().getFullYear(), selectedMonth: new Date().getMonth() + 1,
  viewMode: 'alumnos', showPaymentModal: false, paymentData: null,
  showEstadisticas: false, // AGREGAR esta línea
  modalPosition: { top: 0, left: 0 } // Nueva propiedad para posición
});

  useEffect(() => { loadData(); }, [ui.selectedYear, ui.selectedMonth]);

  const loadData = async () => {
    try {
      setUi(prev => ({ ...prev, loading: true, error: '' }));
      const [alumnosRes, cursosRes, familiaresRes, pagosRes, cuotasRes] = await Promise.all([
        alumnoAPI.getAll(), cursoAPI.getAll(), familiarAPI.getAll(), 
        pagoAPI.getAll(), cuotaAPI.getAll()
      ]);
      
      setData({
        alumnos: alumnosRes.data, cursos: cursosRes.data, familiares: familiaresRes.data,
        pagos: pagosRes.data, cuotas: cuotasRes.data
      });
    } catch (err) {
      const apiError = handleAPIError(err);
      setUi(prev => ({ 
        ...prev, 
        error: apiError.type === 'auth' 
          ? 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
          : `Error al cargar los datos: ${apiError.message}`
      }));
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  };

  // Función auxiliar para formatear fechas para la API
  const formatearFechaParaAPI = (fecha) => {
    if (!fecha) return null;
    return fecha.toISOString().split('T')[0];
  };

  // Función mejorada para calcular fecha de vencimiento
  const getFechaVencimiento = (curso, mes, año) => {
    if (!curso) return null;
    
    const ultimoDiaMes = new Date(año, mes, 0).getDate();
    const diaVencimiento = Math.min(curso.dia_vencimiento_cuota || 10, ultimoDiaMes);
    return new Date(año, mes - 1, diaVencimiento);
  };

  // Función getCuotaDelMes CORREGIDA con fecha_vencimiento
  const getCuotaDelMes = async (cursoId, mes, año) => {
    let cuota = data.cuotas.find(c => c.curso === cursoId && c.mes === mes && c.año === año);
    
    if (!cuota) {
      const curso = data.cursos.find(c => c.id === cursoId);
      if (!curso) return null;
      
      try {
        // Calcular la fecha de vencimiento
        const fechaVencimiento = getFechaVencimiento(curso, mes, año);
        const fechaVencimientoFormatted = formatearFechaParaAPI(fechaVencimiento);
        
        console.log('Creando cuota con datos:', {
          curso: cursoId, 
          mes, 
          año, 
          monto: curso.cuota_mensual || 0,
          fecha_vencimiento: fechaVencimientoFormatted
        });
        
        const nuevaCuotaRes = await cuotaAPI.create({
          curso: cursoId, 
          mes, 
          año, 
          monto: curso.cuota_mensual || 0,
          fecha_vencimiento: fechaVencimientoFormatted // ¡Campo requerido!
        });
        
        cuota = nuevaCuotaRes.data;
        setData(prev => ({ ...prev, cuotas: [...prev.cuotas, cuota] }));
      } catch (error) {
        console.error('Error creando cuota:', error);
        // Log más detallado para debugging
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          console.error('Response headers:', error.response.headers);
        }
        return null;
      }
    }
    return cuota;
  };

  const openPaymentModal = (alumnoId, cursoId, familiarId, event) => {
    const alumno = data.alumnos.find(a => a.id === alumnoId);
    const curso = data.cursos.find(c => c.id === cursoId);
    const familiar = data.familiares.find(f => f.id === familiarId);
    
    // Obtener posición del botón
    const buttonRect = event.target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    setUi(prev => ({
      ...prev,
      showPaymentModal: true,
      paymentData: { alumnoId, cursoId, familiarId, alumno, curso, familiar },
      modalPosition: {
        top: buttonRect.bottom + scrollTop + 10, // 10px debajo del botón
        left: Math.max(20, buttonRect.left - 200) // Centrado con respecto al botón, mínimo 20px del borde
      }
    }));

    // Auto-scroll hacia abajo después de abrir el modal
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    }, 100); // Pequeño delay para asegurar que el modal se haya renderizado
  };

  const closePaymentModal = () => {
    setUi(prev => ({ ...prev, showPaymentModal: false, paymentData: null }));
  };
const mostrarEstadisticas = () => {
  setUi(prev => ({ ...prev, showEstadisticas: true }));
};

const volverDePagos = () => {
  setUi(prev => ({ ...prev, showEstadisticas: false }));
};
  const handlePagoConMes = async (mes, año) => {
    const { alumnoId, cursoId, familiarId, curso } = ui.paymentData;
    
    try {
      const cuota = await getCuotaDelMes(cursoId, mes, año);
      if (!cuota) {
        alert('Error: No se pudo obtener la información de la cuota');
        return;
      }

      const fechaHoy = new Date();
      const fechaVencimiento = getFechaVencimiento(curso, mes, año);
      const esAtraso = fechaHoy > fechaVencimiento;
      
      const diasAtraso = esAtraso ? Math.ceil((fechaHoy - fechaVencimiento) / (1000 * 60 * 60 * 24)) : 0;

      const confirmMessage = esAtraso 
        ? `¿Confirmar pago de ${mesesNombres[mes - 1]} ${año} CON ATRASO (${diasAtraso} días)?`
        : `¿Confirmar pago de ${mesesNombres[mes - 1]} ${año} A TIEMPO?`;

      if (!confirm(confirmMessage)) return;

      await pagoAPI.create({
        alumno: alumnoId,
        cuota: cuota.id,
        familiar: familiarId,
        fecha_pago: formatearFechaParaAPI(new Date()),
        monto_pagado: cuota.monto,
        estado_pago: esAtraso ? 'con_atraso' : 'a_tiempo',
        dias_atraso_pago: diasAtraso
      });

      alert(`Pago registrado exitosamente ${esAtraso ? 'CON ATRASO' : 'A TIEMPO'}`);
      closePaymentModal();
      loadData();
    } catch (err) {
      const apiError = handleAPIError(err);
      alert(`Error al registrar el pago: ${apiError.message}`);
      console.error('Error completo al registrar pago:', err);
    }
  };

 const PaymentModal = () => {
  if (!ui.showPaymentModal || !ui.paymentData) return null;

  const { alumno, curso, familiar } = ui.paymentData;
  const añoActual = new Date().getFullYear();

  return (
    <>
      {/* Overlay con efecto blur */}
      <div className="pagos-modal-overlay" onClick={closePaymentModal}>
        <div className="pagos-modal-backdrop"></div>
      </div>
      
      {/* Modal posicionado */}
      <div 
        className="pagos-modal-positioned"
        style={{
          top: `${ui.modalPosition.top}px`,
          left: `${ui.modalPosition.left}px`
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div className="pagos-modal-header">
          <div className="pagos-modal-header-content">
            <div className="pagos-modal-title">
              <DollarSign className="w-5 h-5" />
              <h3>Registrar Pago</h3>
            </div>
            <button onClick={closePaymentModal} className="pagos-modal-close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Información del pago */}
        <div className="pagos-modal-info">
          <div className="pagos-info-card">
            <div className="pagos-info-row">
              <User className="w-4 h-4 text-purple-500" />
              <span className="pagos-info-label">Alumno:</span>
              <span className="pagos-info-value">{alumno.nombre} {alumno.apellido}</span>
            </div>
            <div className="pagos-info-row">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span className="pagos-info-label">Curso:</span>
              <span className="pagos-info-value">{curso.nombre}</span>
            </div>
            <div className="pagos-info-row">
              <Users className="w-4 h-4 text-green-500" />
              <span className="pagos-info-label">Familiar:</span>
              <span className="pagos-info-value">{familiar.nombre} {familiar.apellido}</span>
            </div>
            <div className="pagos-info-divider"></div>
            <div className="pagos-info-row">
              <DollarSign className="w-4 h-4 text-yellow-500" />
              <span className="pagos-info-label">Cuota mensual:</span>
              <span className="pagos-info-value pagos-price">${curso.cuota_mensual}</span>
            </div>
            <div className="pagos-info-row">
              <Calendar className="w-4 h-4 text-red-500" />
              <span className="pagos-info-label">Vence día:</span>
              <span className="pagos-info-value">{curso.dia_vencimiento_cuota || 10} de cada mes</span>
            </div>
          </div>
        </div>

        {/* Selector de meses mejorado */}
        <div className="pagos-modal-months">
          <h4 className="pagos-months-title">
            <Calendar className="w-4 h-4" />
            Seleccionar mes a pagar
          </h4>
          
          <div className="pagos-months-grid">
            {mesesNombres.map((mes, index) => {
              const mesNum = index + 1;
              const fechaVencimiento = getFechaVencimiento(curso, mesNum, añoActual);
              const hoy = new Date();
              const esAtraso = hoy > fechaVencimiento;
              const yaPagado = yaPagoCuota(alumno.id, curso.id, mesNum, añoActual);
              
              const getStatusInfo = () => {
                if (yaPagado) return { icon: Check, text: 'Pagado', class: 'pagado' };
                if (esAtraso) return { icon: AlertTriangle, text: 'Con atraso', class: 'atraso' };
                return { icon: Clock, text: 'A tiempo', class: 'tiempo' };
              };
              
              const status = getStatusInfo();

              return (
                <button
                  key={index}
                  onClick={() => handlePagoConMes(mesNum, añoActual)}
                  disabled={yaPagado}
                  className={`pagos-month-card ${status.class}`}
                  title={`${mes} ${añoActual} - ${status.text}`}
                >
                  <div className="pagos-month-header">
                    <span className="pagos-month-name">{mes}</span>
                    <status.icon className="w-3 h-3" />
                  </div>
                  
                  <div className="pagos-month-status">
                    {status.text}
                  </div>
                  
                  <div className="pagos-month-due">
                    Vence: {fechaVencimiento?.getDate()}/{fechaVencimiento?.getMonth() + 1}
                  </div>
                  
                  {!yaPagado && (
                    <div className="pagos-month-amount">
                      ${curso.cuota_mensual}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Footer del modal */}
        <div className="pagos-modal-footer">
          <button onClick={closePaymentModal} className="pagos-modal-cancel">
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
};

  // Funciones auxiliares simplificadas
  const getAlumnoFamiliares = (alumnoId) => data.familiares.filter(f => f.alumno === alumnoId);
  const getAlumnoCurso = (alumnoId) => {
    const alumno = data.alumnos.find(a => a.id === alumnoId);
    return alumno?.curso ? data.cursos.find(c => c.id === alumno.curso) : null;
  };
  const yaPagoCuota = (alumnoId, cursoId, mes, año) => {
    const cuota = data.cuotas.find(c => c.curso === cursoId && c.mes === mes && c.año === año);
    return cuota ? data.pagos.some(p => p.alumno === alumnoId && p.cuota === cuota.id) : false;
  };
  const getAlumnosDeCurso = (cursoId) => data.alumnos.filter(a => a.curso === cursoId);
  const getPagosCursoMes = (cursoId, mes, año) => {
    const cuota = data.cuotas.find(c => c.curso === cursoId && c.mes === mes && c.año === año);
    return cuota ? data.pagos.filter(p => p.cuota === cuota.id) : [];
  };
  const getCuotaInfo = (cursoId, mes, año) => {
    const cuota = data.cuotas.find(c => c.curso === cursoId && c.mes === mes && c.año === año);
    if (cuota) return cuota;
    const curso = data.cursos.find(c => c.id === cursoId);
    return curso ? { monto: curso.cuota_mensual || 0, fecha_vencimiento: null } : null;
  };

  if (ui.loading) {
    return (
      <div className="pagos-container">
        <div className="pagos-loading">
          <div className="pagos-loading-spinner"></div>
          <div className="text-lg">Cargando datos...</div>
        </div>
      </div>
    );
  }

  if (ui.error) {
    return (
      <div className="pagos-container">
        <div className="pagos-error">
          <div className="pagos-error-message">{ui.error}</div>
          {ui.error.includes('Sesión expirada') && (
            <button onClick={() => window.location.reload()} className="pagos-error-button">
              Recargar página
            </button>
          )}
          <button onClick={onBack} className="pagos-error-button">Volver al inicio</button>
        </div>
      </div>
    );
  }

  const renderAlumnoView = () => (
    <div className="space-y-4">
      {data.alumnos.map(alumno => {
        const curso = getAlumnoCurso(alumno.id);
        const cuotaInfo = curso ? getCuotaInfo(curso.id, ui.selectedMonth, ui.selectedYear) : null;
        const yaPago = curso ? yaPagoCuota(alumno.id, curso.id, ui.selectedMonth, ui.selectedYear) : false;
        const familiaresAlumno = getAlumnoFamiliares(alumno.id);
        
        return (
          <Card key={alumno.id} className="alumno-card pagos-fade-in">
            <CardHeader>
              <div className="pagos-card-header-content">
                <div className="pagos-card-info">
                  <h3>{alumno.nombre} {alumno.apellido}</h3>
                  <p>Curso: {curso ? curso.nombre : 'Sin curso asignado'}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {cuotaInfo && curso ? (
                    <div className={`pagos-status-badge ${yaPago ? 'pagado' : 'pendiente'}`}>
                      {yaPago ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      {yaPago ? 'Pagado' : 'Pendiente'}
                    </div>
                  ) : (
                    <div className="pagos-status-badge sin-cuota">Sin curso</div>
                  )}
                </div>
                
                <button
                  onClick={() => setUi(prev => ({ 
                    ...prev, 
                    expandedAlumno: prev.expandedAlumno === alumno.id ? null : alumno.id 
                  }))}
                  className="pagos-expand-button"
                >
                  {ui.expandedAlumno === alumno.id ? 
                    <ChevronDown className="w-5 h-5" /> : 
                    <ChevronRight className="w-5 h-5" />
                  }
                </button>
              </div>
            </CardHeader>
            
            {ui.expandedAlumno === alumno.id && (
              <CardContent>
                <div className="pagos-content-grid">
                  <div className="pagos-section">
                    <h4><Users className="w-4 h-4" />Familiares Asignados</h4>
                    
                    {familiaresAlumno.length > 0 ? (
                      <div className="pagos-familiares-list">
                        {familiaresAlumno.map(familiar => (
                          <div key={familiar.id} className="pagos-familiar-item">
                            <div className="pagos-familiar-info">
                              <h5>{familiar.nombre} {familiar.apellido}</h5>
                              <p>{familiar.parentesco}</p>
                            </div>
                            
                            {curso && (
                              <button
                                onClick={(e) => openPaymentModal(alumno.id, curso.id, familiar.id, e)}
                                className="pagos-pagar-button"
                                >
                                <DollarSign className="w-4 h-4" />
                                Registrar Pago
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No hay familiares asignados</p>
                    )}
                  </div>
                  
                  <div className="pagos-section">
                    <h4><Calendar className="w-4 h-4" />Historial {ui.selectedYear}</h4>
                    
                    <div className="pagos-historial-grid">
                      {mesesNombres.map((mes, index) => {
                        const pagadoMes = curso ? yaPagoCuota(alumno.id, curso.id, index + 1, ui.selectedYear) : false;
                        
                        return (
                          <div
                            key={index}
                            className={`pagos-mes-item ${
                              pagadoMes ? 'pagado' : curso ? 'pendiente' : 'sin-cuota'
                            }`}
                          >
                            {mes.slice(0, 3)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );

  const renderCursoView = () => (
    <div className="space-y-4">
      {data.cursos.map(curso => {
        const alumnosCurso = getAlumnosDeCurso(curso.id);
        const pagosMes = getPagosCursoMes(curso.id, ui.selectedMonth, ui.selectedYear);
        
        return (
          <Card key={curso.id} className="curso-card pagos-fade-in">
            <CardHeader>
              <div className="pagos-card-header-content">
                <div className="pagos-card-info">
                  <h3>{curso.nombre}</h3>
                  <p>{alumnosCurso.length} alumnos • {pagosMes.length} pagos en {mesesNombres[ui.selectedMonth - 1]}</p>
                  <p>Cuota mensual: ${curso.cuota_mensual || 0} • Vence el día {curso.dia_vencimiento_cuota || 10}</p>
                </div>
                
                <button
                  onClick={() => setUi(prev => ({ 
                    ...prev, 
                    expandedCurso: prev.expandedCurso === curso.id ? null : curso.id 
                  }))}
                  className="pagos-expand-button"
                >
                  {ui.expandedCurso === curso.id ? 
                    <ChevronDown className="w-5 h-5" /> : 
                    <ChevronRight className="w-5 h-5" />
                  }
                </button>
              </div>
            </CardHeader>
            
            {ui.expandedCurso === curso.id && (
              <CardContent>
                <div className="pagos-content-grid">
                  <div className="pagos-section">
                    <h4>Pagos de {mesesNombres[ui.selectedMonth - 1]} {ui.selectedYear}</h4>
                    
                    {alumnosCurso.length > 0 ? (
                      <div className="pagos-alumnos-mes">
                        {alumnosCurso.map(alumno => {
                          const yaPago = yaPagoCuota(alumno.id, curso.id, ui.selectedMonth, ui.selectedYear);
                          
                          return (
                            <div key={alumno.id} className={`pagos-alumno-item ${yaPago ? 'pagado' : 'pendiente'}`}>
                              <span>{alumno.nombre} {alumno.apellido}</span>
                              {yaPago ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600">No hay alumnos en este curso</p>
                    )}
                  </div>
                  
                  <div className="pagos-section">
                    <h4>Resumen Anual por Alumno</h4>
                    
                    <div className="pagos-resumen-anual">
                      {alumnosCurso.map(alumno => (
                        <div key={alumno.id} className="pagos-alumno-resumen">
                          <h5>{alumno.nombre} {alumno.apellido}</h5>
                          {[0, 6].map(startMonth => (
                            <div key={startMonth} className="pagos-meses-visual">
                              {Array.from({ length: 6 }, (_, i) => {
                                const mesReal = startMonth + i + 1;
                                const pagadoMes = yaPagoCuota(alumno.id, curso.id, mesReal, ui.selectedYear);
                                
                                return (
                                  <div
                                    key={mesReal}
                                    className={`pagos-mes-visual ${pagadoMes ? 'pagado' : 'pendiente'}`}
                                    title={`${mesesNombres[mesReal - 1]} - ${pagadoMes ? 'Pagado' : 'Pendiente'}`}
                                  >
                                    {mesReal}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
if (ui.showEstadisticas) {
  return (
    <EstadisticasPagos 
      user={user} 
      onBack={volverDePagos} 
    />
  );
}
  return (
    <div className="pagos-container">
      <div className="pagos-content">
        {/* Header */}
        <div className="pagos-header pagos-fade-in">
          <div className="pagos-header-content">
            <div>
              <button onClick={onBack} className="pagos-back-button">
                <ArrowLeft className="w-5 h-5" />
                Volver
              </button>
              <h1 className="pagos-title">Sistema de Gestión de Pagos</h1>
              <div className="pagos-user-info">
                Usuario: {user.first_name} {user.last_name} ({user.username})
              </div>
            </div>
          </div>
        </div>
        
        {/* Controles */}
        <div className="pagos-controls pagos-slide-in">
          <div className="pagos-view-toggle">
            {[
              { mode: 'alumnos', icon: User, label: 'Ver por Alumnos' },
              { mode: 'cursos', icon: BookOpen, label: 'Ver por Cursos' }
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setUi(prev => ({ ...prev, viewMode: mode }))}
                className={`pagos-view-button ${ui.viewMode === mode ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          
          <div className="pagos-filters">
            <select
              value={ui.selectedYear}
              onChange={(e) => setUi(prev => ({ ...prev, selectedYear: parseInt(e.target.value) }))}
              className="pagos-select"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
            
            <select
              value={ui.selectedMonth}
              onChange={(e) => setUi(prev => ({ ...prev, selectedMonth: parseInt(e.target.value) }))}
              className="pagos-select"
            >
              {mesesNombres.map((mes, index) => (
                <option key={index + 1} value={index + 1}>{mes}</option>
              ))}
            </select>
            
            {/* AGREGAR ESTA LÍNEA */}
            <ExportarPagos
              alumnos={data.alumnos}
              cursos={data.cursos}
              familiares={data.familiares}
              pagos={data.pagos}
              cuotas={data.cuotas}
              selectedMonth={ui.selectedMonth}
              selectedYear={ui.selectedYear}
            />
          </div>
          <button onClick={mostrarEstadisticas} className="pagos-estadisticas-button">
            <BarChart3 className="w-4 h-4" />
            Ver Estadísticas
          </button>
        </div>

        {ui.viewMode === 'alumnos' ? renderAlumnoView() : renderCursoView()}

        <div className="pagos-current-date">
          <p>
            Fecha actual: {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </p>
        </div>
      </div>
      
      <PaymentModal />
    </div>
  );
};

export default PagosComponent;