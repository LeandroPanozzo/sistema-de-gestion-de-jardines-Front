import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';

interface Alumno {
  id?: number;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  curso: number | null;
  curso_nombre?: string;
  edad?: number;
  observaciones?: string;
}

interface ExportObservacionesProps {
  alumnos: Alumno[];
  cursoNombre: string;
  nombreArchivo?: string;
}

export const exportarObservacionesAWord = async ({ 
  alumnos, 
  cursoNombre, 
  nombreArchivo 
}: ExportObservacionesProps): Promise<void> => {
  try {
    // Filtrar solo alumnos con observaciones
    const alumnosConObservaciones = alumnos.filter(alumno => 
      alumno.observaciones && alumno.observaciones.trim() !== ''
    );

    // Crear el documento
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Título principal
          new Paragraph({
            children: [
              new TextRun({
                text: `Observaciones - ${cursoNombre}`,
                bold: true,
                size: 32,
                color: "2563eb"
              })
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // Información general
          new Paragraph({
            children: [
              new TextRun({
                text: `Fecha de generación: ${new Date().toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}`,
                italics: true,
                size: 20
              })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Total de alumnos con observaciones: ${alumnosConObservaciones.length}`,
                bold: true,
                size: 22
              })
            ],
            spacing: { after: 400 }
          }),

          // Separador
          new Paragraph({
            children: [
              new TextRun({
                text: "─".repeat(80),
                color: "6b7280"
              })
            ],
            spacing: { after: 300 }
          }),

          // Contenido de observaciones
          ...alumnosConObservaciones.flatMap((alumno, index) => [
            // Número de alumno
            new Paragraph({
              children: [
                new TextRun({
                  text: `${index + 1}. `,
                  bold: true,
                  size: 24,
                  color: "1f2937"
                })
              ],
              spacing: { before: 300, after: 100 }
            }),

            // Información del alumno en tabla
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Nombre completo:",
                              bold: true,
                              size: 20
                            })
                          ]
                        })
                      ],
                      width: {
                        size: 25,
                        type: WidthType.PERCENTAGE,
                      },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `${alumno.nombre} ${alumno.apellido}`,
                              size: 20
                            })
                          ]
                        })
                      ],
                      width: {
                        size: 75,
                        type: WidthType.PERCENTAGE,
                      },
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "DNI:",
                              bold: true,
                              size: 20
                            })
                          ]
                        })
                      ]
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: alumno.dni,
                              size: 20
                            })
                          ]
                        })
                      ]
                    }),
                  ],
                }),
                ...(alumno.edad ? [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Edad:",
                                bold: true,
                                size: 20
                              })
                            ]
                          })
                        ]
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: `${alumno.edad} años`,
                                size: 20
                              })
                            ]
                          })
                        ]
                      }),
                    ],
                  })
                ] : []),
              ],
            }),

            // Espacio antes de observaciones
            new Paragraph({
              children: [new TextRun({ text: "" })],
              spacing: { after: 200 }
            }),

            // Título de observaciones
            new Paragraph({
              children: [
                new TextRun({
                  text: "Observaciones:",
                  bold: true,
                  size: 22,
                  color: "dc2626"
                })
              ],
              spacing: { after: 100 }
            }),

            // Contenido de observaciones
            new Paragraph({
              children: [
                new TextRun({
                  text: alumno.observaciones || 'Sin observaciones',
                  size: 20
                })
              ],
              spacing: { after: 200 }
            }),

            // Separador entre alumnos
            new Paragraph({
              children: [
                new TextRun({
                  text: "• • •",
                  color: "9ca3af"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 }
            })
          ]),

          // Pie de página con resumen
          new Paragraph({
            children: [
              new TextRun({
                text: "─".repeat(80),
                color: "6b7280"
              })
            ],
            spacing: { before: 400, after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Fin del reporte - ${cursoNombre}`,
                italics: true,
                size: 18,
                color: "6b7280"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          })
        ]
      }]
    });

    // Crear el nombre del archivo
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreFinal = nombreArchivo || 
      `Observaciones_${cursoNombre.replace(/\s+/g, '_')}_${fechaActual}.docx`;

    // Generar el archivo usando toBlob() en lugar de toBuffer()
    const blob = await Packer.toBlob(doc);
    
    // Descargar el archivo
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreFinal;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Archivo exportado: ${nombreFinal}`);
    
  } catch (error) {
    console.error('Error al exportar observaciones a Word:', error);
    throw new Error('No se pudo generar el archivo Word. Intenta nuevamente.');
  }
};

// Función auxiliar para exportar todos los cursos
export const exportarTodosLosCursos = async (
  cursosConAlumnos: Array<{
    id: number;
    nombre: string;
    alumnos: Alumno[];
  }>
): Promise<void> => {
  try {
    const todosLosAlumnos = cursosConAlumnos.flatMap(curso => 
      curso.alumnos.map(alumno => ({
        ...alumno,
        curso_nombre: curso.nombre
      }))
    );

    await exportarObservacionesAWord({
      alumnos: todosLosAlumnos,
      cursoNombre: 'Todos_los_Cursos',
      nombreArchivo: `Observaciones_Completas_${new Date().toISOString().split('T')[0]}.docx`
    });
  } catch (error) {
    console.error('Error al exportar todos los cursos:', error);
    throw error;
  }
};

// Función para verificar si hay observaciones para exportar
export const tieneObservacionesParaExportar = (alumnos: Alumno[]): boolean => {
  return alumnos.some(alumno => 
    alumno.observaciones && alumno.observaciones.trim() !== ''
  );
};