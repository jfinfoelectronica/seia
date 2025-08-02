import * as XLSX from 'xlsx';
import { ComprehensiveForkEvaluation } from './gemini-github-evaluation';

interface GithubFork {
  id: number;
  full_name: string;
  html_url: string;
  stargazers_count: number;
  owner: {
    login: string;
  };
}

interface StudentInfo {
  identificacion: string;
  nombres: string;
  apellidos: string;
  grupo: string;
  error?: string;
}

interface ExportData {
  fork: GithubFork;
  evaluation: ComprehensiveForkEvaluation;
  studentInfo: StudentInfo | null;
}

export function exportForksToExcel(
  evaluatedForks: ExportData[],
  filename: string = 'evaluaciones_forks.xlsx'
) {
  // Hoja 1: Resumen general
  const summaryData = evaluatedForks.map((data, index) => ({
    'N°': index + 1,
    'Estudiante': data.evaluation.studentName || data.fork.owner.login || 'N/A',
    'Grupo': data.studentInfo?.grupo || 'N/A',
    'Repositorio': data.fork.full_name,
    'URL': data.fork.html_url,
    'Puntuación General': data.evaluation.overallScore.toFixed(2),
    'Actividades Completadas': data.evaluation.completedActivities,
    'Total Actividades': data.evaluation.totalActivities,
    'Porcentaje Completado': `${((data.evaluation.completedActivities / data.evaluation.totalActivities) * 100).toFixed(1)}%`,
    'Fecha Evaluación': new Date(data.evaluation.evaluatedAt).toLocaleDateString(),
    'Hora Evaluación': new Date(data.evaluation.evaluatedAt).toLocaleTimeString(),
  }));

  // Hoja 2: Detalles por actividad
  const activitiesData: Record<string, string | number>[] = [];
  evaluatedForks.forEach((data, forkIndex) => {
    data.evaluation.activities.forEach((activity, activityIndex) => {
      activitiesData.push({
        'N° Fork': forkIndex + 1,
        'Estudiante': data.evaluation.studentName || data.fork.owner.login || 'N/A',
        'Repositorio': data.fork.full_name,
        'N° Actividad': activityIndex + 1,
        'Descripción': activity.activityDescription,
        'Archivo Solución': activity.solutionFile,
        'Archivo Encontrado': activity.fileFound ? 'Sí' : 'No',
        'Puntuación': activity.score.toFixed(2),
        'Retroalimentación': activity.feedback || 'Sin retroalimentación',
      });
    });
  });

  // Hoja 3: Estadísticas generales
  const totalForks = evaluatedForks.length;
  const averageScore = evaluatedForks.reduce((sum, data) => sum + data.evaluation.overallScore, 0) / totalForks;
  const totalActivities = evaluatedForks.reduce((sum, data) => sum + data.evaluation.totalActivities, 0);
  const completedActivities = evaluatedForks.reduce((sum, data) => sum + data.evaluation.completedActivities, 0);
  const completionRate = (completedActivities / totalActivities) * 100;

  // Distribución de puntuaciones
  const scoreRanges = {
    'Excelente (4.5-5.0)': 0,
    'Bueno (3.5-4.4)': 0,
    'Regular (2.5-3.4)': 0,
    'Deficiente (1.5-2.4)': 0,
    'Muy Deficiente (0.0-1.4)': 0,
  };

  evaluatedForks.forEach(data => {
    const score = data.evaluation.overallScore;
    if (score >= 4.5) scoreRanges['Excelente (4.5-5.0)']++;
    else if (score >= 3.5) scoreRanges['Bueno (3.5-4.4)']++;
    else if (score >= 2.5) scoreRanges['Regular (2.5-3.4)']++;
    else if (score >= 1.5) scoreRanges['Deficiente (1.5-2.4)']++;
    else scoreRanges['Muy Deficiente (0.0-1.4)']++;
  });

  const statisticsData = [
    { 'Métrica': 'Total de Forks Evaluados', 'Valor': totalForks },
    { 'Métrica': 'Puntuación Promedio', 'Valor': averageScore.toFixed(2) },
    { 'Métrica': 'Total de Actividades', 'Valor': totalActivities },
    { 'Métrica': 'Actividades Completadas', 'Valor': completedActivities },
    { 'Métrica': 'Tasa de Completado (%)', 'Valor': completionRate.toFixed(1) },
    { 'Métrica': '', 'Valor': '' }, // Separador
    { 'Métrica': 'DISTRIBUCIÓN DE PUNTUACIONES', 'Valor': '' },
    ...Object.entries(scoreRanges).map(([range, count]) => ({
      'Métrica': range,
      'Valor': count
    }))
  ];

  // Crear el libro de trabajo
  const workbook = XLSX.utils.book_new();

  // Agregar hojas
  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
  const activitiesWorksheet = XLSX.utils.json_to_sheet(activitiesData);
  const statisticsWorksheet = XLSX.utils.json_to_sheet(statisticsData);

  // Configurar anchos de columna para mejor legibilidad
  const summaryColWidths = [
    { wch: 5 },   // N°
    { wch: 20 },  // Estudiante
    { wch: 10 },  // Grupo
    { wch: 25 },  // Repositorio
    { wch: 50 },  // URL
    { wch: 15 },  // Puntuación General
    { wch: 20 },  // Actividades Completadas
    { wch: 15 },  // Total Actividades
    { wch: 18 },  // Porcentaje Completado
    { wch: 15 },  // Fecha Evaluación
    { wch: 15 },  // Hora Evaluación
  ];

  const activitiesColWidths = [
    { wch: 8 },   // N° Fork
    { wch: 20 },  // Estudiante
    { wch: 25 },  // Repositorio
    { wch: 12 },  // N° Actividad
    { wch: 40 },  // Descripción
    { wch: 25 },  // Archivo Solución
    { wch: 15 },  // Archivo Encontrado
    { wch: 12 },  // Puntuación
    { wch: 50 },  // Retroalimentación
  ];

  const statisticsColWidths = [
    { wch: 30 },  // Métrica
    { wch: 15 },  // Valor
  ];

  summaryWorksheet['!cols'] = summaryColWidths;
  activitiesWorksheet['!cols'] = activitiesColWidths;
  statisticsWorksheet['!cols'] = statisticsColWidths;

  // Agregar las hojas al libro
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen General');
  XLSX.utils.book_append_sheet(workbook, activitiesWorksheet, 'Detalles por Actividad');
  XLSX.utils.book_append_sheet(workbook, statisticsWorksheet, 'Estadísticas');

  // Descargar el archivo
  XLSX.writeFile(workbook, filename);
}

export function generateExcelFileName(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `evaluaciones_forks_${dateStr}_${timeStr}.xlsx`;
}