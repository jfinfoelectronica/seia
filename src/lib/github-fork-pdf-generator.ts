import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ComprehensiveForkEvaluation } from './gemini-github-evaluation';

// Interface para extender jsPDF con autoTable
interface DocWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (...args: unknown[]) => void;
}

/**
 * Genera un reporte PDF para una evaluación de fork de GitHub
 * @param evaluation Evaluación del fork
 * @param forkUrl URL del fork evaluado
 * @returns Buffer del PDF generado
 */
export function generateForkEvaluationPDF(
  evaluation: ComprehensiveForkEvaluation,
  forkUrl: string
): ArrayBuffer {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  let y = 20;

  // Helper para agregar texto y manejar la posición Y
  const addText = (text: string, x: number, startY: number, options?: Record<string, unknown>) => {
    const splitText = doc.splitTextToSize(text, 180);
    doc.text(splitText, x, startY, options);
    return startY + (doc.getTextDimensions(splitText).h) + 2;
  };

  // Helper para verificar salto de página
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // Título del reporte
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  y = addText('Reporte de Evaluación - Fork de GitHub', 14, y) + 5;

  // Información básica
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  y = addText('Información General', 14, y) + 2;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y = addText(`Estudiante: ${evaluation.studentName}`, 14, y);
  y = addText(`Repositorio: ${forkUrl}`, 14, y);
  y = addText(`Fecha de evaluación: ${new Date(evaluation.evaluatedAt).toLocaleString('es-ES')}`, 14, y);
  y = addText(`Evaluado por: ${evaluation.evaluatedBy}`, 14, y) + 5;

  // Resumen de calificaciones
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  y = addText('Resumen de Calificaciones', 14, y) + 2;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y = addText(`Calificación general: ${evaluation.overallScore.toFixed(1)}/5.0`, 14, y);
  y = addText(`Actividades completadas: ${evaluation.completedActivities}/${evaluation.totalActivities}`, 14, y);
  
  // Porcentaje de completitud
  const completionPercentage = (evaluation.completedActivities / evaluation.totalActivities * 100).toFixed(1);
  y = addText(`Porcentaje de completitud: ${completionPercentage}%`, 14, y) + 5;

  // Tabla de actividades
  checkPageBreak(50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  y = addText('Detalle de Actividades', 14, y) + 5;

  // Preparar datos para la tabla
  const tableData = evaluation.activities.map((activity, index) => [
    (index + 1).toString(),
    activity.activityDescription.substring(0, 40) + (activity.activityDescription.length > 40 ? '...' : ''),
    activity.solutionFile,
    activity.fileFound ? 'Sí' : 'No',
    activity.score.toFixed(1)
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Descripción', 'Archivo', 'Encontrado', 'Calificación']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 60 },
      2: { cellWidth: 50 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as DocWithAutoTable).lastAutoTable.finalY + 10;

  // Retroalimentación detallada por actividad
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  y = addText('Retroalimentación Detallada', 14, y) + 5;

  evaluation.activities.forEach((activity, index) => {
    checkPageBreak(25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    y = addText(`Actividad ${index + 1}: ${activity.activityDescription}`, 14, y);
    
    doc.setFont('helvetica', 'normal');
    y = addText(`Archivo esperado: ${activity.solutionFile}`, 18, y);
    y = addText(`Estado: ${activity.fileFound ? 'Archivo encontrado' : 'Archivo no encontrado'}`, 18, y);
    y = addText(`Calificación: ${activity.score.toFixed(1)}/5.0`, 18, y);
    
    if (activity.feedback) {
      y = addText('Retroalimentación:', 18, y);
      y = addText(activity.feedback, 22, y);
    }
    y += 3;
  });

  // Resumen general
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  y = addText('Resumen General', 14, y) + 2;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y = addText(evaluation.summary, 14, y) + 5;

  // Recomendaciones
  if (evaluation.recommendations && evaluation.recommendations.length > 0) {
    checkPageBreak(20 + evaluation.recommendations.length * 5);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    y = addText('Recomendaciones', 14, y) + 2;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    evaluation.recommendations.forEach(recommendation => {
      y = addText(`• ${recommendation}`, 18, y);
    });
  }

  // Pie de página con información adicional
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${totalPages}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    doc.text('Generado por Sistema de Evaluación IA', 14, doc.internal.pageSize.height - 10);
  }

  return doc.output('arraybuffer');
}

/**
 * Sube un archivo PDF al repositorio de GitHub
 * @param repoUrl URL del repositorio original (owner/repo)
 * @param fileName Nombre del archivo PDF
 * @param pdfBuffer Buffer del PDF
 * @param githubToken Token de GitHub
 * @param commitMessage Mensaje del commit
 * @returns Promise<boolean> - true si se subió exitosamente
 */
export async function uploadPDFToRepository(
  repoUrl: string,
  fileName: string,
  pdfBuffer: ArrayBuffer,
  githubToken: string,
  commitMessage: string = 'Agregar reporte de evaluación'
): Promise<boolean> {
  try {
    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    const filePath = `reports/${fileName}`;
    
    // Convertir ArrayBuffer a base64
    const uint8Array = new Uint8Array(pdfBuffer);
    const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    const base64Content = btoa(binaryString);

    // Verificar si el archivo ya existe
    let sha: string | undefined;
    try {
      const existingFileResponse = await fetch(
        `https://api.github.com/repos/${repoUrl}/contents/${filePath}`,
        { headers: { ...headers, 'Content-Type': 'application/json' } }
      );
      
      if (existingFileResponse.ok) {
        const existingFile = await existingFileResponse.json();
        sha = existingFile.sha;
      }
    } catch {
      // El archivo no existe, continuamos sin SHA
    }

    // Crear o actualizar el archivo
    const requestBody: Record<string, unknown> = {
      message: commitMessage,
      content: base64Content,
    };

    if (sha) {
      requestBody.sha = sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${repoUrl}/contents/${filePath}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error al subir PDF:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error al subir PDF al repositorio:', error);
    return false;
  }
}

/**
 * Genera el nombre del archivo PDF basado en el fork
 * @param forkUrl URL del fork (owner/repo)
 * @param studentName Nombre del estudiante
 * @returns Nombre del archivo PDF
 */
export function generatePDFFileName(forkUrl: string, studentName: string): string {
  const sanitizedStudentName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const forkName = forkUrl.split('/')[1] || 'fork';
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  return `evaluacion_${forkName}_${sanitizedStudentName}_${timestamp}.pdf`;
}