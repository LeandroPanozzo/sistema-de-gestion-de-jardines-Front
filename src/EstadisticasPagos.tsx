import React, { useState, useEffect } from 'react';
import './EstadisticasPagos.css';
import { 
  BarChart3, PieChart, TrendingUp, TrendingDown, Users, DollarSign, 
  Calendar, AlertTriangle, CheckCircle, Clock, ArrowLeft, BookOpen,
  Download, Filter, Eye
} from 'lucide-react';
import { 
  alumnoAPI, cursoAPI, familiarAPI, pagoAPI, cuotaAPI,
  handleAPIError, UserData 
} from './config/api';

interface EstadisticasPagosProps {
  user: UserData;
  onBack: () => void;
}

interface EstadisticasCurso {
  cursoId: number;
  nombreCurso: string;
  totalAlumnos: number;
  pagosATiempo: number;
  pagosConAtraso: number;
  sinPagar: number;
  porcentajePagosATiempo: number;
  porcentajePagosConAtraso: number;
  porcentajeSinPagar: number;
  montoTotal: number;
  montoRecaudado: number;
  montosPendientes: number;
  promedioAtraso: number;
}

interface EstadisticasGenerales {
  totalCursos: number;
  totalAlumnos: number;
  totalPagosATiempo: number;
  totalPagosConAtraso: number;
  totalSinPagar: number;
  porcentajeGeneralATiempo: number;
  porcentajeGeneralConAtraso: number;
  porcentajeGeneralSinPagar: number;
  montoTotalEsperado: number;
  montoTotalRecaudado: number;
  montoTotalPendiente: number;
  promedioAtrasoGeneral: number;
}

const Card = ({ children, className = "" }) => (
  <div className={`estadisticas-card ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = "" }) => (
  <div className={`estadisticas-card-header ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`estadisticas-card-content ${className}`}>{children}</div>
);

const mesesNombres = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatearMonto = (monto) => {
  if (monto === null || monto === undefined || isNaN(monto)) {
    return '0.00';
  }
  const numero = parseFloat(monto);
  return numero.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const EstadisticasPagos: React.FC<EstadisticasPagosProps> = ({ user, onBack }) => {
  const [data, setData] = useState({
    alumnos: [], cursos: [], familiares: [], pagos: [], cuotas: []
  });
  const [ui, setUi] = useState({
    loading: true,
    error: '',
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth() + 1,
    selectedCurso: 'todos',
    viewMode: 'resumen',
    isYearView: false // Nueva propiedad
  });
  const [estadisticas, setEstadisticas] = useState<{
    generales: EstadisticasGenerales | null;
    porCurso: EstadisticasCurso[];
  }>({
    generales: null,
    porCurso: []
  });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { calcularEstadisticas(); }, [data, ui.selectedYear, ui.selectedMonth, ui.selectedCurso, ui.isYearView]);

  const loadData = async () => {
    try {
      setUi(prev => ({ ...prev, loading: true, error: '' }));
      const [alumnosRes, cursosRes, familiaresRes, pagosRes, cuotasRes] = await Promise.all([
        alumnoAPI.getAll(), cursoAPI.getAll(), familiarAPI.getAll(), 
        pagoAPI.getAll(), cuotaAPI.getAll()
      ]);
      
      setData({
        alumnos: alumnosRes.data, 
        cursos: cursosRes.data, 
        familiares: familiaresRes.data,
        pagos: pagosRes.data, 
        cuotas: cuotasRes.data
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

  const yaPagoCuota = (alumnoId, cursoId, mes, año) => {
    const cuota = data.cuotas.find(c => c.curso === cursoId && c.mes === mes && c.año === año);
    if (!cuota) return false;
    return data.pagos.find(p => p.alumno === alumnoId && p.cuota === cuota.id);
  };

  const calcularEstadisticas = () => {
    if (!data.cursos.length || !data.alumnos.length) return;

    const cursosAFiltrar = ui.selectedCurso === 'todos' 
      ? data.cursos 
      : data.cursos.filter(c => c.id === parseInt(ui.selectedCurso));

    const mesesAProcesar = ui.isYearView 
      ? Array.from({length: 12}, (_, i) => i + 1)
      : [ui.selectedMonth];

    const estadisticasPorCurso: EstadisticasCurso[] = cursosAFiltrar.map(curso => {
      const alumnosCurso = data.alumnos.filter(a => a.curso === curso.id);
      
      let pagosATiempo = 0;
      let pagosConAtraso = 0;
      let sinPagar = 0;
      let sumaAtrasos = 0;
      let cantidadAtrasos = 0;
      let montoRecaudado = 0;

      mesesAProcesar.forEach(mes => {
        alumnosCurso.forEach(alumno => {
          const pago = yaPagoCuota(alumno.id, curso.id, mes, ui.selectedYear);
          if (pago) {
            montoRecaudado += parseFloat(pago.monto_pagado) || 0;
            if (pago.estado_pago === 'con_atraso') {
              pagosConAtraso++;
              sumaAtrasos += pago.dias_atraso_pago || 0;
              cantidadAtrasos++;
            } else {
              pagosATiempo++;
            }
          } else {
            sinPagar++;
          }
        });
      });

      const totalPagosEsperados = alumnosCurso.length * mesesAProcesar.length;
      const montoTotal = totalPagosEsperados * (parseFloat(curso.cuota_mensual) || 0);
      const montosPendientes = montoTotal - montoRecaudado;

      return {
        cursoId: curso.id,
        nombreCurso: curso.nombre,
        totalAlumnos: alumnosCurso.length,
        pagosATiempo,
        pagosConAtraso,
        sinPagar,
        porcentajePagosATiempo: totalPagosEsperados > 0 ? (pagosATiempo / totalPagosEsperados) * 100 : 0,
        porcentajePagosConAtraso: totalPagosEsperados > 0 ? (pagosConAtraso / totalPagosEsperados) * 100 : 0,
        porcentajeSinPagar: totalPagosEsperados > 0 ? (sinPagar / totalPagosEsperados) * 100 : 0,
        montoTotal,
        montoRecaudado,
        montosPendientes,
        promedioAtraso: cantidadAtrasos > 0 ? sumaAtrasos / cantidadAtrasos : 0
      };
    });

    // Estadísticas generales
    const totales = estadisticasPorCurso.reduce((acc, curr) => ({
      totalCursos: acc.totalCursos + 1,
      totalAlumnos: acc.totalAlumnos + curr.totalAlumnos,
      totalPagosATiempo: acc.totalPagosATiempo + curr.pagosATiempo,
      totalPagosConAtraso: acc.totalPagosConAtraso + curr.pagosConAtraso,
      totalSinPagar: acc.totalSinPagar + curr.sinPagar,
      montoTotalEsperado: acc.montoTotalEsperado + curr.montoTotal,
      montoTotalRecaudado: acc.montoTotalRecaudado + curr.montoRecaudado,
      montoTotalPendiente: acc.montoTotalPendiente + curr.montosPendientes,
      sumaAtrasos: acc.sumaAtrasos + (curr.promedioAtraso * curr.pagosConAtraso),
      cantidadAtrasos: acc.cantidadAtrasos + curr.pagosConAtraso
    }), {
      totalCursos: 0, totalAlumnos: 0, totalPagosATiempo: 0, totalPagosConAtraso: 0,
      totalSinPagar: 0, montoTotalEsperado: 0, montoTotalRecaudado: 0, montoTotalPendiente: 0,
      sumaAtrasos: 0, cantidadAtrasos: 0
    });

    const totalPagosEsperados = totales.totalPagosATiempo + totales.totalPagosConAtraso + totales.totalSinPagar;

    const estadisticasGenerales: EstadisticasGenerales = {
      ...totales,
      porcentajeGeneralATiempo: totalPagosEsperados > 0 ? (totales.totalPagosATiempo / totalPagosEsperados) * 100 : 0,
      porcentajeGeneralConAtraso: totalPagosEsperados > 0 ? (totales.totalPagosConAtraso / totalPagosEsperados) * 100 : 0,
      porcentajeGeneralSinPagar: totalPagosEsperados > 0 ? (totales.totalSinPagar / totalPagosEsperados) * 100 : 0,
      promedioAtrasoGeneral: totales.cantidadAtrasos > 0 ? totales.sumaAtrasos / totales.cantidadAtrasos : 0
    };

    setEstadisticas({
      generales: estadisticasGenerales,
      porCurso: estadisticasPorCurso
    });
  };

  if (ui.loading) {
    return (
      <div className="estadisticas-container">
        <div className="estadisticas-loading">
          <div className="estadisticas-loading-spinner"></div>
          <div className="text-lg">Cargando estadísticas...</div>
        </div>
      </div>
    );
  }

  if (ui.error) {
    return (
      <div className="estadisticas-container">
        <div className="estadisticas-error">
          <div className="estadisticas-error-message">{ui.error}</div>
          <button onClick={onBack} className="estadisticas-error-button">Volver al inicio</button>
        </div>
      </div>
    );
  }

  const renderResumenGeneral = () => {
    if (!estadisticas.generales) return null;

    const { generales } = estadisticas;

    return (
      <div className="estadisticas-resumen">
        {/* Métricas principales */}
        <div className="estadisticas-metricas-grid">
          <Card className="estadisticas-metrica pagos-tiempo">
            <CardContent>
              <div className="estadisticas-metrica-content">
                <CheckCircle className="estadisticas-metrica-icon" />
                <div className="estadisticas-metrica-info">
                  <h3>{generales.totalPagosATiempo}</h3>
                  <p>Pagos a Tiempo</p>
                  <span className="estadisticas-porcentaje">
                    {generales.porcentajeGeneralATiempo.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="estadisticas-metrica pagos-atraso">
            <CardContent>
              <div className="estadisticas-metrica-content">
                <AlertTriangle className="estadisticas-metrica-icon" />
                <div className="estadisticas-metrica-info">
                  <h3>{generales.totalPagosConAtraso}</h3>
                  <p>Pagos con Atraso</p>
                  <span className="estadisticas-porcentaje">
                    {generales.porcentajeGeneralConAtraso.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="estadisticas-metrica sin-pagar">
            <CardContent>
              <div className="estadisticas-metrica-content">
                <Clock className="estadisticas-metrica-icon" />
                <div className="estadisticas-metrica-info">
                  <h3>{generales.totalSinPagar}</h3>
                  <p>Sin Pagar</p>
                  <span className="estadisticas-porcentaje">
                    {generales.porcentajeGeneralSinPagar.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="estadisticas-metrica monto-total">
            <CardContent>
              <div className="estadisticas-metrica-content">
                <DollarSign className="estadisticas-metrica-icon" />
                <div className="estadisticas-metrica-info">
                  <h3>${formatearMonto(generales.montoTotalRecaudado)}</h3>
                  <p>Recaudado</p>
                  <span className="estadisticas-porcentaje">
                    de ${formatearMonto(generales.montoTotalEsperado)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de barras visual */}
        <Card className="estadisticas-grafico">
          <CardHeader>
            <h3><BarChart3 className="w-5 h-5" />Distribución de Pagos</h3>
          </CardHeader>
          <CardContent>
            <div className="estadisticas-barra-container">
              <div className="estadisticas-barra-visual">
                <div 
                  className="estadisticas-barra-segmento pagos-tiempo"
                  style={{ width: `${generales.porcentajeGeneralATiempo}%` }}
                  title={`Pagos a tiempo: ${generales.porcentajeGeneralATiempo.toFixed(1)}%`}
                >
                  {generales.porcentajeGeneralATiempo > 10 && (
                    <span>{generales.porcentajeGeneralATiempo.toFixed(1)}%</span>
                  )}
                </div>
                <div 
                  className="estadisticas-barra-segmento pagos-atraso"
                  style={{ width: `${generales.porcentajeGeneralConAtraso}%` }}
                  title={`Pagos con atraso: ${generales.porcentajeGeneralConAtraso.toFixed(1)}%`}
                >
                  {generales.porcentajeGeneralConAtraso > 10 && (
                    <span>{generales.porcentajeGeneralConAtraso.toFixed(1)}%</span>
                  )}
                </div>
                <div 
                  className="estadisticas-barra-segmento sin-pagar"
                  style={{ width: `${generales.porcentajeGeneralSinPagar}%` }}
                  title={`Sin pagar: ${generales.porcentajeGeneralSinPagar.toFixed(1)}%`}
                >
                  {generales.porcentajeGeneralSinPagar > 10 && (
                    <span>{generales.porcentajeGeneralSinPagar.toFixed(1)}%</span>
                  )}
                </div>
              </div>
              <div className="estadisticas-barra-leyenda">
                <div className="estadisticas-leyenda-item">
                  <div className="estadisticas-leyenda-color pagos-tiempo"></div>
                  <span>A tiempo ({generales.totalPagosATiempo})</span>
                </div>
                <div className="estadisticas-leyenda-item">
                  <div className="estadisticas-leyenda-color pagos-atraso"></div>
                  <span>Con atraso ({generales.totalPagosConAtraso})</span>
                </div>
                <div className="estadisticas-leyenda-item">
                  <div className="estadisticas-leyenda-color sin-pagar"></div>
                  <span>Sin pagar ({generales.totalSinPagar})</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <div className="estadisticas-info-adicional">
          <Card>
            <CardHeader>
              <h3><TrendingUp className="w-5 h-5" />Información Adicional</h3>
            </CardHeader>
            <CardContent>
              <div className="estadisticas-info-grid">
                <div className="estadisticas-info-item">
                  <Users className="w-4 h-4" />
                  <span>Total de alumnos: <strong>{generales.totalAlumnos}</strong></span>
                </div>
                <div className="estadisticas-info-item">
                  <BookOpen className="w-4 h-4" />
                  <span>Total de cursos: <strong>{generales.totalCursos}</strong></span>
                </div>
                <div className="estadisticas-info-item">
                  <DollarSign className="w-4 h-4" />
                  <span>Monto pendiente: <strong>${formatearMonto(generales.montoTotalPendiente)}</strong></span>
                </div>
                <div className="estadisticas-info-item">
                  <Clock className="w-4 h-4" />
                  <span>Promedio de atraso: <strong>{generales.promedioAtrasoGeneral.toFixed(1)} días</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderDetallePorCurso = () => {
    return (
      <div className="estadisticas-detalle">
        <div className="estadisticas-cursos-grid">
          {estadisticas.porCurso.map(curso => (
            <Card key={curso.cursoId} className="estadisticas-curso-card">
              <CardHeader>
                <h3>{curso.nombreCurso}</h3>
                <p>{curso.totalAlumnos} alumnos</p>
              </CardHeader>
              <CardContent>
                <div className="estadisticas-curso-metricas">
                  <div className="estadisticas-curso-metrica pagos-tiempo">
                    <CheckCircle className="w-4 h-4" />
                    <span>{curso.pagosATiempo} ({curso.porcentajePagosATiempo.toFixed(1)}%)</span>
                  </div>
                  <div className="estadisticas-curso-metrica pagos-atraso">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{curso.pagosConAtraso} ({curso.porcentajePagosConAtraso.toFixed(1)}%)</span>
                  </div>
                  <div className="estadisticas-curso-metrica sin-pagar">
                    <Clock className="w-4 h-4" />
                    <span>{curso.sinPagar} ({curso.porcentajeSinPagar.toFixed(1)}%)</span>
                  </div>
                </div>
                
                <div className="estadisticas-curso-barra">
                  <div 
                    className="estadisticas-curso-segmento pagos-tiempo"
                    style={{ width: `${curso.porcentajePagosATiempo}%` }}
                  ></div>
                  <div 
                    className="estadisticas-curso-segmento pagos-atraso"
                    style={{ width: `${curso.porcentajePagosConAtraso}%` }}
                  ></div>
                  <div 
                    className="estadisticas-curso-segmento sin-pagar"
                    style={{ width: `${curso.porcentajeSinPagar}%` }}
                  ></div>
                </div>

                <div className="estadisticas-curso-montos">
                  <div className="estadisticas-curso-monto">
                    <span>Recaudado:</span>
                    <strong>${formatearMonto(curso.montoRecaudado)}</strong>
                  </div>
                  <div className="estadisticas-curso-monto">
                    <span>Pendiente:</span>
                    <strong>${formatearMonto(curso.montosPendientes)}</strong>
                  </div>
                  {curso.promedioAtraso > 0 && (
                    <div className="estadisticas-curso-monto">
                      <span>Promedio atraso:</span>
                      <strong>{curso.promedioAtraso.toFixed(1)} días</strong>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="estadisticas-container">
      <div className="estadisticas-content">
        {/* Header */}
        <div className="estadisticas-header">
          <div className="estadisticas-header-content">
            <div>
              <button onClick={onBack} className="estadisticas-back-button">
                <ArrowLeft className="w-5 h-5" />
                Volver
              </button>
              <h1 className="estadisticas-title">Estadísticas de Pagos</h1>
              <div className="estadisticas-user-info">
                Usuario: {user.first_name} {user.last_name} ({user.username})
              </div>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="estadisticas-controls">
          <div className="estadisticas-filters">
            <select
              value={ui.selectedYear}
              onChange={(e) => setUi(prev => ({ ...prev, selectedYear: parseInt(e.target.value) }))}
              className="estadisticas-select"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
            
            <select
              value={ui.isYearView ? 'año' : ui.selectedMonth}
              onChange={(e) => {
                if (e.target.value === 'año') {
                  setUi(prev => ({ ...prev, isYearView: true }));
                } else {
                  setUi(prev => ({ 
                    ...prev, 
                    selectedMonth: parseInt(e.target.value), 
                    isYearView: false 
                  }));
                }
              }}
              className="estadisticas-select"
            >
              <option value="año">Año completo</option>
              {mesesNombres.map((mes, index) => (
                <option key={index + 1} value={index + 1}>{mes}</option>
              ))}
            </select>

            <select
              value={ui.selectedCurso}
              onChange={(e) => setUi(prev => ({ ...prev, selectedCurso: e.target.value }))}
              className="estadisticas-select"
            >
              <option value="todos">Todos los cursos</option>
              {data.cursos.map(curso => (
                <option key={curso.id} value={curso.id}>{curso.nombre}</option>
              ))}
            </select>
          </div>

          <div className="estadisticas-view-toggle">
            <button
              onClick={() => setUi(prev => ({ ...prev, viewMode: 'resumen' }))}
              className={`estadisticas-view-button ${ui.viewMode === 'resumen' ? 'active' : ''}`}
            >
              <PieChart className="w-4 h-4" />
              Resumen
            </button>
            <button
              onClick={() => setUi(prev => ({ ...prev, viewMode: 'detalle' }))}
              className={`estadisticas-view-button ${ui.viewMode === 'detalle' ? 'active' : ''}`}
            >
              <BarChart3 className="w-4 h-4" />
              Por Curso
            </button>
          </div>
        </div>

        {/* Periodo seleccionado */}
        <div className="estadisticas-periodo">
          <h2>
            {ui.isYearView ? `Año ${ui.selectedYear}` : `${mesesNombres[ui.selectedMonth - 1]} ${ui.selectedYear}`}
            {ui.selectedCurso !== 'todos' && (
              <span> - {data.cursos.find(c => c.id === parseInt(ui.selectedCurso))?.nombre}</span>
            )}
          </h2>
        </div>

        {/* Contenido principal */}
        {ui.viewMode === 'resumen' ? renderResumenGeneral() : renderDetallePorCurso()}
      </div>
    </div>
  );
};

export default EstadisticasPagos;