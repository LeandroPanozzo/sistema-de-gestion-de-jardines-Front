import React from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportarPagosProps {
  alumnos: any[];
  cursos: any[];
  familiares: any[];
  pagos: any[];
  cuotas: any[];
  selectedMonth: number;
  selectedYear: number;
}

const mesesNombres = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ExportarPagos: React.FC<ExportarPagosProps> = ({
  alumnos,
  cursos,
  familiares,
  pagos,
  cuotas,
  selectedMonth,
  selectedYear
}) => {

  const exportarAExcel = () => {
    try {
      // Crear libro de trabajo
      const workbook = XLSX.utils.book_new();

      // HOJA 1: Resumen de Pagos del Mes
      const resumenPagos = generarResumenPagos();
      const wsResumen = XLSX.utils.json_to_sheet(resumenPagos);
      
      // Configurar anchos de columna para resumen
      wsResumen['!cols'] = [
        { width: 20 }, // Curso
        { width: 25 }, // Alumno
        { width: 15 }, // Estado
        { width: 15 }, // Monto
        { width: 15 }, // Fecha Pago
        { width: 12 }, // Días Atraso
        { width: 20 }, // Familiar Pagador
        { width: 15 }, // Fecha Vencimiento
      ];

      XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen Pagos');

      // HOJA 2: Detalle por Curso
      const detalleCursos = generarDetalleCursos();
      const wsDetalle = XLSX.utils.json_to_sheet(detalleCursos);
      
      // Configurar anchos de columna para detalle
      wsDetalle['!cols'] = [
        { width: 20 }, // Curso
        { width: 15 }, // Total Alumnos
        { width: 15 }, // Alumnos Pagaron
        { width: 15 }, // Alumnos Pendientes
        { width: 15 }, // Cuota Mensual
        { width: 15 }, // Total Recaudado
        { width: 15 }, // Total Pendiente
        { width: 12 }, // Porcentaje Pago
      ];

      XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle por Curso');

      // HOJA 3: Listado Completo de Alumnos
      const listadoCompleto = generarListadoCompleto();
      const wsListado = XLSX.utils.json_to_sheet(listadoCompleto);
      
      // Configurar anchos de columna para listado
      wsListado['!cols'] = [
        { width: 25 }, // Alumno
        { width: 20 }, // Curso
        { width: 15 }, // Estado Pago
        { width: 15 }, // Monto Cuota
        { width: 15 }, // Fecha Vencimiento
        { width: 15 }, // Fecha Pago
        { width: 20 }, // Familiar Pagador
        { width: 15 }, // Días Atraso
        { width: 15 }, // Estado Temporal
      ];

      XLSX.utils.book_append_sheet(workbook, wsListado, 'Listado Completo');

      // HOJA 4: Familiares y Contactos
      const familiaresDatos = generarDatosFamiliares();
      const wsFamiliares = XLSX.utils.json_to_sheet(familiaresDatos);
      
      // Configurar anchos de columna para familiares
      wsFamiliares['!cols'] = [
        { width: 25 }, // Alumno
        { width: 25 }, // Familiar
        { width: 15 }, // Parentesco
        { width: 20 }, // Teléfono
        { width: 25 }, // Email
        { width: 15 }, // ¿Pagó este mes?
      ];

      XLSX.utils.book_append_sheet(workbook, wsFamiliares, 'Familiares');

      // Generar nombre del archivo
      const nombreArchivo = `Pagos_${mesesNombres[selectedMonth - 1]}_${selectedYear}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(workbook, nombreArchivo);

      console.log(`Archivo ${nombreArchivo} exportado exitosamente`);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al generar el archivo Excel. Por favor intenta nuevamente.');
    }
  };

  const generarResumenPagos = () => {
    const resumen: any[] = [];

    alumnos.forEach(alumno => {
      const curso = cursos.find(c => c.id === alumno.curso);
      if (!curso) return;

      // Buscar cuota del mes
      const cuota = cuotas.find(c => 
        c.curso === curso.id && 
        c.mes === selectedMonth && 
        c.año === selectedYear
      );

      // Buscar pago del mes
      const pago = cuota ? pagos.find(p => 
        p.alumno === alumno.id && 
        p.cuota === cuota.id
      ) : null;

      // Información del familiar pagador
      let familiarPagador = '';
      if (pago) {
        const familiar = familiares.find(f => f.id === pago.familiar);
        familiarPagador = familiar ? `${familiar.nombre} ${familiar.apellido}` : 'N/A';
      }

      // Calcular fecha de vencimiento
      const diaVencimiento = curso.dia_vencimiento_cuota || 10;
      const fechaVencimiento = new Date(selectedYear, selectedMonth - 1, diaVencimiento);

      resumen.push({
        'Curso': curso.nombre,
        'Alumno': `${alumno.nombre} ${alumno.apellido}`,
        'Estado': pago ? 'PAGADO' : 'PENDIENTE',
        'Monto': cuota ? cuota.monto : (curso.cuota_mensual || 0),
        'Fecha Pago': pago ? new Date(pago.fecha_pago).toLocaleDateString('es-ES') : '-',
        'Días Atraso': pago ? (pago.dias_atraso_pago || 0) : '-',
        'Familiar Pagador': familiarPagador || '-',
        'Fecha Vencimiento': fechaVencimiento.toLocaleDateString('es-ES'),
        'Estado Temporal': pago ? (pago.estado_pago === 'a_tiempo' ? 'A TIEMPO' : 'CON ATRASO') : 'SIN PAGAR'
      });
    });

    return resumen;
  };

  const generarDetalleCursos = () => {
    const detalle: any[] = [];

    cursos.forEach(curso => {
      const alumnosCurso = alumnos.filter(a => a.curso === curso.id);
      
      // Calcular pagos del mes
      const cuota = cuotas.find(c => 
        c.curso === curso.id && 
        c.mes === selectedMonth && 
        c.año === selectedYear
      );

      const pagosDelMes = cuota ? pagos.filter(p => 
        p.cuota === cuota.id && 
        alumnosCurso.some(a => a.id === p.alumno)
      ) : [];

      const totalAlumnos = alumnosCurso.length;
      const alumnosPagaron = pagosDelMes.length;
      const alumnosPendientes = totalAlumnos - alumnosPagaron;
      const cuotaMensual = curso.cuota_mensual || 0;
      const totalRecaudado = alumnosPagaron * cuotaMensual;
      const totalPendiente = alumnosPendientes * cuotaMensual;
      const porcentajePago = totalAlumnos > 0 ? Math.round((alumnosPagaron / totalAlumnos) * 100) : 0;

      detalle.push({
        'Curso': curso.nombre,
        'Total Alumnos': totalAlumnos,
        'Alumnos Pagaron': alumnosPagaron,
        'Alumnos Pendientes': alumnosPendientes,
        'Cuota Mensual': `$${cuotaMensual}`,
        'Total Recaudado': `$${totalRecaudado}`,
        'Total Pendiente': `$${totalPendiente}`,
        'Porcentaje Pago': `${porcentajePago}%`
      });
    });

    return detalle;
  };

  const generarListadoCompleto = () => {
    const listado: any[] = [];

    alumnos.forEach(alumno => {
      const curso = cursos.find(c => c.id === alumno.curso);
      if (!curso) return;

      const cuota = cuotas.find(c => 
        c.curso === curso.id && 
        c.mes === selectedMonth && 
        c.año === selectedYear
      );

      const pago = cuota ? pagos.find(p => 
        p.alumno === alumno.id && 
        p.cuota === cuota.id
      ) : null;

      let familiarPagador = '-';
      if (pago) {
        const familiar = familiares.find(f => f.id === pago.familiar);
        familiarPagador = familiar ? `${familiar.nombre} ${familiar.apellido}` : 'N/A';
      }

      const diaVencimiento = curso.dia_vencimiento_cuota || 10;
      const fechaVencimiento = new Date(selectedYear, selectedMonth - 1, diaVencimiento);

      listado.push({
        'Alumno': `${alumno.nombre} ${alumno.apellido}`,
        'Curso': curso.nombre,
        'Estado Pago': pago ? 'PAGADO' : 'PENDIENTE',
        'Monto Cuota': `$${cuota ? cuota.monto : (curso.cuota_mensual || 0)}`,
        'Fecha Vencimiento': fechaVencimiento.toLocaleDateString('es-ES'),
        'Fecha Pago': pago ? new Date(pago.fecha_pago).toLocaleDateString('es-ES') : '-',
        'Familiar Pagador': familiarPagador,
        'Días Atraso': pago ? (pago.dias_atraso_pago || 0) : '-',
        'Estado Temporal': pago ? (pago.estado_pago === 'a_tiempo' ? 'A TIEMPO' : 'CON ATRASO') : 'SIN PAGAR'
      });
    });

    return listado;
  };

  const generarDatosFamiliares = () => {
    const datosFamiliares: any[] = [];

    alumnos.forEach(alumno => {
      const familiariesAlumno = familiares.filter(f => f.alumno === alumno.id);
      const curso = cursos.find(c => c.id === alumno.curso);
      
      if (familiariesAlumno.length === 0) {
        // Si no tiene familiares, agregar una fila con datos del alumno
        datosFamiliares.push({
          'Alumno': `${alumno.nombre} ${alumno.apellido}`,
          'Familiar': 'SIN FAMILIAR ASIGNADO',
          'Parentesco': '-',
          'Teléfono': '-',
          'Email': '-',
          '¿Pagó este mes?': 'NO PUEDE PAGAR (SIN FAMILIAR)'
        });
      } else {
        // Para cada familiar del alumno
        familiariesAlumno.forEach(familiar => {
          // Verificar si este familiar realizó un pago este mes
          const cuota = curso ? cuotas.find(c => 
            c.curso === curso.id && 
            c.mes === selectedMonth && 
            c.año === selectedYear
          ) : null;

          const pagoRealizado = cuota ? pagos.find(p => 
            p.alumno === alumno.id && 
            p.cuota === cuota.id && 
            p.familiar === familiar.id
          ) : null;

          datosFamiliares.push({
            'Alumno': `${alumno.nombre} ${alumno.apellido}`,
            'Familiar': `${familiar.nombre} ${familiar.apellido}`,
            'Parentesco': familiar.parentesco || '-',
            'Teléfono': familiar.telefono || '-',
            'Email': familiar.email || '-',
            '¿Pagó este mes?': pagoRealizado ? 'SÍ' : 'NO'
          });
        });
      }
    });

    return datosFamiliares;
  };

  return (
    <button
      onClick={exportarAExcel}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
      title={`Exportar datos de ${mesesNombres[selectedMonth - 1]} ${selectedYear} a Excel`}
    >
      <FileSpreadsheet className="w-4 h-4" />
      Guardar en Excel
      <Download className="w-3 h-3" />
    </button>
  );
};

export default ExportarPagos;