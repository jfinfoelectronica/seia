import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './apiKeyService';

export interface GitHubFileContent {
  name: string;
  path: string;
  content: string;
  type: 'file' | 'directory';
  language?: string;
}

export interface ActivityEvaluationCriteria {
  completeness: number; // 0-5: ¿Está completa la actividad?
  codeQuality: number; // 0-5: Calidad del código
  documentation: number; // 0-5: Documentación y comentarios
  functionality: number; // 0-5: ¿Funciona correctamente?
  bestPractices: number; // 0-5: Buenas prácticas de programación
}

export interface GitHubEvaluationResult {
  repositoryUrl: string;
  studentName: string;
  overallScore: number; // 0-5: Calificación general
  criteria: ActivityEvaluationCriteria;
  strengths: string[]; // Fortalezas encontradas
  improvements: string[]; // Áreas de mejora
  feedback: string; // Retroalimentación detallada
  summary: string; // Resumen de la evaluación
  filesAnalyzed: number; // Número de archivos analizados
  missingFiles: string[]; // Archivos esperados pero no encontrados
  recommendations: string[]; // Recomendaciones específicas como array
}

// Nuevas interfaces para evaluación por actividades individuales
export interface ActivitySolution {
  activity: string;
  solution: string;
}

export interface IndividualActivityEvaluation {
  activityDescription: string;
  solutionFile: string;
  score: number; // 0-5: Calificación de esta actividad específica
  fileFound: boolean; // Si se encontró el archivo de solución
  feedback: string; // Retroalimentación específica para esta actividad
}

export interface ComprehensiveForkEvaluation {
  repositoryUrl: string;
  studentName: string;
  activities: IndividualActivityEvaluation[]; // Evaluación de cada actividad
  overallScore: number; // Promedio de todas las actividades
  totalActivities: number;
  completedActivities: number;
  summary: string; // Resumen general del fork
  recommendations: string[]; // Recomendaciones generales
  evaluatedAt: string; // Timestamp de cuando se evaluó
  evaluatedBy: string; // Quien realizó la evaluación
}

// Interface para el archivo de evaluaciones persistidas
export interface PersistedEvaluations {
  [forkUrl: string]: ComprehensiveForkEvaluation;
}

// Interface para metadatos de evaluación
export interface EvaluationMetadata {
  lastUpdated: string;
  totalEvaluations: number;
  version: string;
}

/**
 * Obtiene un archivo específico de un repositorio de GitHub
 * @param repoUrl URL del repositorio (ej: "usuario/repositorio")
 * @param filePath Ruta del archivo específico
 * @param githubToken Token de GitHub (opcional)
 * @returns Contenido del archivo o null si no existe
 */
export async function getSpecificFile(
  repoUrl: string,
  filePath: string,
  githubToken?: string
): Promise<GitHubFileContent | null> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  try {
    const fileResponse = await fetch(
      `https://api.github.com/repos/${repoUrl}/contents/${filePath}`,
      { headers }
    );

    if (!fileResponse.ok) {
      return null; // Archivo no encontrado
    }

    const fileData = await fileResponse.json();
    
    if (fileData.type === 'file') {
      // Obtener contenido del archivo
      const contentResponse = await fetch(fileData.download_url);
      if (contentResponse.ok) {
        const content = await contentResponse.text();
        return {
          name: fileData.name,
          path: fileData.path,
          content,
          type: 'file',
          language: getLanguageFromExtension(fileData.name)
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Error al obtener archivo ${filePath}:`, error);
    return null;
  }
}

/**
 * Obtiene el contenido de archivos de un repositorio de GitHub
 * @param repoUrl URL del repositorio (ej: "usuario/repositorio")
 * @param githubToken Token de GitHub (opcional)
 * @returns Array de archivos con su contenido
 */
export async function getRepositoryFiles(
  repoUrl: string,
  githubToken?: string
): Promise<GitHubFileContent[]> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  try {
    // Obtener la estructura del repositorio
    const contentsResponse = await fetch(
      `https://api.github.com/repos/${repoUrl}/contents`,
      { headers }
    );

    if (!contentsResponse.ok) {
      throw new Error(`Error al obtener contenidos: ${contentsResponse.status}`);
    }

    const contents = await contentsResponse.json();
    const files: GitHubFileContent[] = [];

    // Procesar archivos en el directorio raíz
    for (const item of contents) {
      if (item.type === 'file') {
        // Obtener contenido del archivo
        const fileResponse = await fetch(item.download_url);
        if (fileResponse.ok) {
          const content = await fileResponse.text();
          files.push({
            name: item.name,
            path: item.path,
            content,
            type: 'file',
            language: getLanguageFromExtension(item.name)
          });
        }
      }
    }

    return files;
  } catch (error) {
    console.error('Error al obtener archivos del repositorio:', error);
    throw new Error('No se pudieron obtener los archivos del repositorio');
  }
}

/**
 * Determina el lenguaje de programación basado en la extensión del archivo
 */
function getLanguageFromExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'html': 'HTML',
    'css': 'CSS',
    'md': 'Markdown',
    'json': 'JSON',
    'xml': 'XML',
    'sql': 'SQL'
  };
  return languageMap[extension || ''] || 'Texto';
}

/**
 * Evalúa una actividad de GitHub usando Gemini AI
 * @param repoUrl URL del repositorio
 * @param studentName Nombre del estudiante
 * @param activityDescription Descripción de la actividad esperada
 * @param githubToken Token de GitHub (opcional)
 * @returns Resultado de la evaluación
 */
export async function evaluateGitHubActivity(
  repoUrl: string,
  studentName: string,
  activityDescription: string,
  githubToken?: string
): Promise<GitHubEvaluationResult> {
  try {
    // Obtener archivos del repositorio
    const files = await getRepositoryFiles(repoUrl, githubToken);
    
    if (files.length === 0) {
      throw new Error('No se encontraron archivos en el repositorio');
    }

    // Preparar contenido para Gemini
    const filesContent = files.map(file => 
      `ARCHIVO: ${file.name} (${file.language})\nRUTA: ${file.path}\nCONTENIDO:\n${file.content}\n\n---\n`
    ).join('\n');

    const apiKey = await getApiKey();
    const genAI = new GoogleGenAI({ apiKey });
    const model = "gemini-2.0-flash";

    const prompt = `
    Eres un evaluador experto de actividades de programación en GitHub. Evalúa el siguiente repositorio de un estudiante.

    ESTUDIANTE: ${studentName}
    REPOSITORIO: ${repoUrl}
    
    DESCRIPCIÓN DE LA ACTIVIDAD ESPERADA:
    ${activityDescription}

    ARCHIVOS DEL REPOSITORIO:
    ${filesContent}

    Evalúa el repositorio según estos criterios (escala 0-5):
    1. COMPLETENESS (0-5): ¿Está completa la actividad según la descripción?
    2. CODE_QUALITY (0-5): Calidad del código (estructura, legibilidad, organización)
    3. DOCUMENTATION (0-5): Documentación, comentarios y README
    4. FUNCTIONALITY (0-5): ¿El código parece funcional y correcto?
    5. BEST_PRACTICES (0-5): Buenas prácticas de programación

    Proporciona también:
    - Un resumen breve de la evaluación (2-3 líneas)
    - 3-5 fortalezas específicas encontradas
    - 3-5 áreas de mejora específicas
    - Retroalimentación detallada y constructiva
    - Número de archivos analizados
    - Archivos que esperarías encontrar pero no están presentes
    - 3-5 recomendaciones específicas para mejorar

    Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
    {
      "repositoryUrl": "${repoUrl}",
      "studentName": "${studentName}",
      "overallScore": number, // Promedio de los 5 criterios
      "criteria": {
        "completeness": number,
        "codeQuality": number,
        "documentation": number,
        "functionality": number,
        "bestPractices": number
      },
      "strengths": string[], // Array de fortalezas
      "improvements": string[], // Array de áreas de mejora
      "feedback": string, // Retroalimentación detallada
      "summary": string, // Resumen breve de la evaluación
      "filesAnalyzed": number, // Número de archivos analizados
      "missingFiles": string[], // Archivos esperados pero ausentes
      "recommendations": string[] // Array de recomendaciones específicas
    }
    `;

    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt
    });

    const text = response.text || '';

    // Extraer el JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const evaluationResult = JSON.parse(jsonMatch[0]) as GitHubEvaluationResult;
        return evaluationResult;
      } catch (error) {
        console.error('Error al parsear la respuesta JSON:', error);
        throw new Error('Error al procesar la evaluación de Gemini');
      }
    }

    throw new Error('No se pudo extraer la evaluación de la respuesta de Gemini');
  } catch (error) {
    console.error('Error al evaluar la actividad de GitHub:', error);
    throw new Error(`Error al evaluar la actividad: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Evalúa múltiples repositorios de forma batch
 * @param repositories Array de repositorios a evaluar
 * @param activityDescription Descripción de la actividad
 * @param githubToken Token de GitHub (opcional)
 * @returns Array de resultados de evaluación
 */
export async function evaluateMultipleRepositories(
  repositories: { url: string; studentName: string }[],
  activityDescription: string,
  githubToken?: string
): Promise<GitHubEvaluationResult[]> {
  const results: GitHubEvaluationResult[] = [];
  
  for (const repo of repositories) {
    try {
      const result = await evaluateGitHubActivity(
        repo.url,
        repo.studentName,
        activityDescription,
        githubToken
      );
      results.push(result);
    } catch (error) {
      console.error(`Error evaluando ${repo.url}:`, error);
      // Crear un resultado de error para mantener la consistencia
      results.push({
        repositoryUrl: repo.url,
        studentName: repo.studentName,
        overallScore: 0,
        criteria: {
          completeness: 0,
          codeQuality: 0,
          documentation: 0,
          functionality: 0,
          bestPractices: 0
        },
        strengths: [],
        improvements: ['Error al evaluar el repositorio'],
        feedback: `Error al evaluar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        summary: 'Error al evaluar el repositorio',
        filesAnalyzed: 0,
        missingFiles: [],
        recommendations: ['Revisar la disponibilidad del repositorio y los permisos de acceso']
      });
    }
  }
  
  return results;
}

/**
 * Evalúa una actividad individual en un fork específico
 * @param repoUrl URL del repositorio fork
 * @param studentName Nombre del estudiante
 * @param activityDescription Descripción de la actividad
 * @param solutionFile Ruta del archivo de solución esperado
 * @param githubToken Token de GitHub (opcional)
 * @returns Evaluación de la actividad individual
 */
export async function evaluateIndividualActivity(
  repoUrl: string,
  studentName: string,
  activityDescription: string,
  solutionFile: string,
  githubToken?: string
): Promise<IndividualActivityEvaluation> {
  try {
    // Buscar el archivo de solución específico
    const solutionFileContent = await getSpecificFile(repoUrl, solutionFile, githubToken);
    
    if (!solutionFileContent) {
      return {
        activityDescription,
        solutionFile,
        score: 0,
        fileFound: false,
        feedback: '' // Sin retroalimentación si no existe el archivo
      };
    }

    // Verificar si el archivo tiene contenido significativo
    if (!solutionFileContent.content || solutionFileContent.content.trim().length === 0) {
      return {
        activityDescription,
        solutionFile,
        score: 0,
        fileFound: true,
        feedback: 'Archivo vacío - sin contenido para evaluar'
      };
    }

    // Verificar contenido mínimo significativo (evitar archivos con solo comentarios o contenido trivial)
    const contentWithoutComments = solutionFileContent.content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentarios de bloque
      .replace(/\/\/.*$/gm, '') // Remover comentarios de línea
      .replace(/#.*$/gm, '') // Remover comentarios de Python/Shell
      .replace(/<!--[\s\S]*?-->/g, '') // Remover comentarios HTML
      .trim();

    // Si después de remover comentarios queda muy poco contenido, calificar con 0
    if (contentWithoutComments.length < 20) {
      return {
        activityDescription,
        solutionFile,
        score: 0,
        fileFound: true,
        feedback: 'Contenido insuficiente - solo comentarios o código trivial'
      };
    }

    const apiKey = await getApiKey();
    const genAI = new GoogleGenAI({ apiKey });
    const model = "gemini-2.0-flash";

    const prompt = `
    Eres un evaluador experto de actividades de programación. Evalúa esta actividad específica de un estudiante.

    ESTUDIANTE: ${studentName}
    REPOSITORIO: ${repoUrl}
    ARCHIVO DE SOLUCIÓN: ${solutionFile}
    
    DESCRIPCIÓN DE LA ACTIVIDAD:
    ${activityDescription}

    CONTENIDO DEL ARCHIVO DE SOLUCIÓN:
    ARCHIVO: ${solutionFileContent.name} (${solutionFileContent.language})
    CONTENIDO:
    ${solutionFileContent.content}

    Evalúa ÚNICAMENTE esta actividad específica con una calificación de 0-5 considerando:
    1. ¿Resuelve correctamente la actividad descrita?
    2. Calidad del código y estructura
    3. Funcionalidad aparente del código
    4. Buenas prácticas aplicadas
    5. Completitud de la solución

    IMPORTANTE: La retroalimentación debe ser CORTA Y CONCISA (máximo 2-3 líneas).
    Enfócate en los puntos más importantes para mejorar.

    Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
    {
      "score": number, // 0-5: Calificación específica de esta actividad
      "feedback": string // Retroalimentación CORTA Y CONCISA (máximo 2-3 líneas)
    }
    `;

    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt
    });

    const text = response.text || '';

    // Extraer el JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        return {
          activityDescription,
          solutionFile,
          score: result.score || 0,
          fileFound: true,
          feedback: result.feedback || 'Sin retroalimentación disponible'
        };
      } catch (error) {
        console.error('Error al parsear la respuesta JSON:', error);
        return {
          activityDescription,
          solutionFile,
          score: 0,
          fileFound: true,
          feedback: 'Error al procesar la evaluación'
        };
      }
    }

    return {
      activityDescription,
      solutionFile,
      score: 0,
      fileFound: true,
      feedback: 'No se pudo obtener evaluación de Gemini'
    };
  } catch (error) {
    console.error('Error al evaluar actividad individual:', error);
    return {
      activityDescription,
      solutionFile,
      score: 0,
      fileFound: false,
      feedback: `Error al evaluar: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Evalúa todas las actividades de un fork basándose en activities.json
 * @param repoUrl URL del repositorio fork
 * @param studentName Nombre del estudiante
 * @param activities Array de actividades del activities.json
 * @param githubToken Token de GitHub (opcional)
 * @param delayBetweenActivities Delay en segundos entre cada evaluación de actividad (por defecto 0)
 * @returns Evaluación comprehensiva del fork
 */
export async function evaluateComprehensiveFork(
  repoUrl: string,
  studentName: string,
  activities: ActivitySolution[],
  githubToken?: string,
  delayBetweenActivities: number = 0
): Promise<ComprehensiveForkEvaluation> {
  const activityEvaluations: IndividualActivityEvaluation[] = [];
  
  // Evaluar cada actividad individualmente con delay configurable
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    const evaluation = await evaluateIndividualActivity(
      repoUrl,
      studentName,
      activity.activity,
      activity.solution,
      githubToken
    );
    activityEvaluations.push(evaluation);
    
    // Agregar delay configurable entre cada evaluación de actividad (excepto en la última)
    if (i < activities.length - 1 && delayBetweenActivities > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenActivities * 1000));
    }
  }

  // Calcular estadísticas generales
  const totalActivities = activities.length;
  const completedActivities = activityEvaluations.filter(evaluation => evaluation.fileFound && evaluation.score > 0).length;
  const totalScore = activityEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
  const overallScore = totalActivities > 0 ? totalScore / totalActivities : 0;

  // Generar resumen y recomendaciones generales
  const summary = generateForkSummary(activityEvaluations, overallScore, completedActivities, totalActivities);
  const recommendations = generateForkRecommendations(activityEvaluations);

  return {
    repositoryUrl: repoUrl,
    studentName,
    activities: activityEvaluations,
    overallScore,
    totalActivities,
    completedActivities,
    summary,
    recommendations,
    evaluatedAt: new Date().toISOString(),
    evaluatedBy: 'Sistema'
  };
}

/**
 * Genera un resumen general del fork
 */
function generateForkSummary(
  evaluations: IndividualActivityEvaluation[],
  overallScore: number,
  completed: number,
  total: number
): string {
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  
  if (overallScore >= 4.0) {
    return `Excelente trabajo. Completó ${completed}/${total} actividades (${completionRate.toFixed(0)}%) con una calificación promedio de ${overallScore.toFixed(1)}/5. Demuestra buen dominio de los conceptos.`;
  } else if (overallScore >= 3.0) {
    return `Buen trabajo general. Completó ${completed}/${total} actividades (${completionRate.toFixed(0)}%) con una calificación promedio de ${overallScore.toFixed(1)}/5. Hay oportunidades de mejora en algunos aspectos.`;
  } else {
    return `Necesita mejorar. Completó ${completed}/${total} actividades (${completionRate.toFixed(0)}%) con una calificación promedio de ${overallScore.toFixed(1)}/5. Se recomienda revisar los conceptos fundamentales.`;
  }
}

/**
 * Genera recomendaciones generales para el fork
 */
function generateForkRecommendations(evaluations: IndividualActivityEvaluation[]): string[] {
  const recommendations: string[] = [];
  
  const missingFiles = evaluations.filter(evaluation => !evaluation.fileFound);
  if (missingFiles.length > 0) {
    recommendations.push(`Completar los archivos faltantes: ${missingFiles.map(evaluation => evaluation.solutionFile).join(', ')}`);
  }
  
  const lowScores = evaluations.filter(evaluation => evaluation.fileFound && evaluation.score < 3.0);
  if (lowScores.length > 0) {
    recommendations.push(`Revisar y mejorar las actividades con calificación baja`);
  }
  
  const averageScore = evaluations.length > 0 ? 
    evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length : 0;
  
  if (averageScore < 3.0) {
    recommendations.push('Enfocarse en mejorar la documentación y comentarios del código');
    recommendations.push('Aplicar mejores prácticas de programación');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Continuar con el excelente trabajo y mantener la calidad del código');
  }
  
  return recommendations.slice(0, 4); // Máximo 4 recomendaciones
}

/**
 * Recupera las evaluaciones guardadas del repositorio original
 * @param originalRepoUrl URL del repositorio original (ej: "usuario/repositorio")
 * @param githubToken Token de GitHub (opcional)
 * @returns Objeto con las evaluaciones guardadas o null si no existe
 */
export async function getPersistedEvaluations(
  originalRepoUrl: string,
  githubToken?: string
): Promise<PersistedEvaluations | null> {
  try {
    const evaluationsFile = await getSpecificFile(originalRepoUrl, 'evaluations.json', githubToken);
    
    if (!evaluationsFile) {
      return null; // No hay evaluaciones guardadas
    }

    const evaluations = JSON.parse(evaluationsFile.content) as PersistedEvaluations;
    return evaluations;
  } catch (error) {
    console.error('Error al recuperar evaluaciones guardadas:', error);
    return null;
  }
}

/**
 * Guarda una evaluación en el repositorio original
 * @param originalRepoUrl URL del repositorio original
 * @param forkUrl URL del fork evaluado
 * @param evaluation Evaluación a guardar
 * @param evaluatedBy Quien realizó la evaluación
 * @param githubToken Token de GitHub (requerido para escribir)
 * @returns true si se guardó exitosamente, false en caso contrario
 */
export async function saveEvaluationToRepository(
  originalRepoUrl: string,
  forkUrl: string,
  evaluation: ComprehensiveForkEvaluation,
  evaluatedBy: string,
  githubToken: string
): Promise<boolean> {
  try {
    // Recuperar evaluaciones existentes
    const existingEvaluations = await getPersistedEvaluations(originalRepoUrl, githubToken) || {};
    
    // Agregar timestamp y evaluador
    const evaluationWithMetadata: ComprehensiveForkEvaluation = {
      ...evaluation,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy
    };
    
    // Actualizar las evaluaciones
    existingEvaluations[forkUrl] = evaluationWithMetadata;
    
    // Preparar el contenido del archivo
    const fileContent = JSON.stringify(existingEvaluations, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(fileContent)));
    
    // Verificar si el archivo ya existe para obtener el SHA
    let sha: string | undefined;
    try {
      const existingFileResponse = await fetch(
        `https://api.github.com/repos/${originalRepoUrl}/contents/evaluations.json`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${githubToken}`
          }
        }
      );
      
      if (existingFileResponse.ok) {
        const existingFileData = await existingFileResponse.json();
        sha = existingFileData.sha;
      }
    } catch {
      // El archivo no existe, se creará uno nuevo
    }
    
    // Crear o actualizar el archivo
    const updateResponse = await fetch(
      `https://api.github.com/repos/${originalRepoUrl}/contents/evaluations.json`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Actualizar evaluación para ${forkUrl}`,
          content: base64Content,
          ...(sha && { sha })
        })
      }
    );
    
    return updateResponse.ok;
  } catch (error) {
    console.error('Error al guardar evaluación:', error);
    return false;
  }
}

/**
 * Verifica si un fork ya ha sido evaluado
 * @param originalRepoUrl URL del repositorio original
 * @param forkUrl URL del fork a verificar
 * @param githubToken Token de GitHub (opcional)
 * @returns La evaluación existente o null si no existe
 */
export async function getExistingEvaluation(
  originalRepoUrl: string,
  forkUrl: string,
  githubToken?: string
): Promise<ComprehensiveForkEvaluation | null> {
  try {
    const evaluations = await getPersistedEvaluations(originalRepoUrl, githubToken);
    
    if (!evaluations) {
      return null;
    }
    
    return evaluations[forkUrl] || null;
  } catch (error) {
    console.error('Error al verificar evaluación existente:', error);
    return null;
  }
}

/**
 * Re-evalúa una actividad individual específica y actualiza la evaluación completa
 * @param originalRepoUrl URL del repositorio original
 * @param forkUrl URL del fork a evaluar
 * @param studentName Nombre del estudiante
 * @param activityIndex Índice de la actividad a re-evaluar
 * @param activities Array completo de actividades del activities.json
 * @param githubToken Token de GitHub
 * @returns Evaluación comprehensiva actualizada del fork
 */
export async function reEvaluateIndividualActivity(
  originalRepoUrl: string,
  forkUrl: string,
  studentName: string,
  activityIndex: number,
  activities: ActivitySolution[],
  githubToken?: string
): Promise<ComprehensiveForkEvaluation | null> {
  try {
    // Validar que se proporcione githubToken
    if (!githubToken) {
      throw new Error('Se requiere un token de GitHub para re-evaluar actividades');
    }

    // Obtener la evaluación existente
    const existingEvaluation = await getExistingEvaluation(originalRepoUrl, forkUrl, githubToken);
    if (!existingEvaluation) {
      throw new Error('No se encontró evaluación existente para actualizar');
    }

    // Verificar que el índice sea válido
    if (activityIndex < 0 || activityIndex >= activities.length) {
      throw new Error('Índice de actividad inválido');
    }

    // Re-evaluar solo la actividad específica
    const activity = activities[activityIndex];
    const newActivityEvaluation = await evaluateIndividualActivity(
      forkUrl,
      studentName,
      activity.activity,
      activity.solution,
      githubToken
    );

    // Actualizar la evaluación existente
    const updatedActivities = [...existingEvaluation.activities];
    updatedActivities[activityIndex] = newActivityEvaluation;

    // Recalcular métricas
    const completedActivities = updatedActivities.filter(evaluation => evaluation.fileFound).length;
    const totalScore = updatedActivities
      .filter(evaluation => evaluation.fileFound)
      .reduce((sum, evaluation) => sum + evaluation.score, 0);
    const overallScore = completedActivities > 0 ? totalScore / completedActivities : 0;

    // Generar nuevo resumen y recomendaciones
    const summary = generateForkSummary(updatedActivities, overallScore, completedActivities, activities.length);
    const recommendations = generateForkRecommendations(updatedActivities);

    // Crear evaluación actualizada
    const updatedEvaluation: ComprehensiveForkEvaluation = {
      ...existingEvaluation,
      activities: updatedActivities,
      overallScore,
      completedActivities,
      summary,
      recommendations,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: 'Sistema (Re-evaluación individual)'
    };

    // Guardar la evaluación actualizada
    await saveEvaluationToRepository(originalRepoUrl, forkUrl, updatedEvaluation, 'Sistema', githubToken);

    return updatedEvaluation;
  } catch (error) {
    console.error('Error al re-evaluar actividad individual:', error);
    return null;
  }
}

/**
 * Evalúa un fork de manera comprehensiva con persistencia
 * @param originalRepoUrl URL del repositorio original
 * @param forkUrl URL del fork a evaluar
 * @param studentName Nombre del estudiante
 * @param activities Array de actividades del activities.json
 * @param evaluatedBy Quien realiza la evaluación
 * @param githubToken Token de GitHub
 * @param forceReEvaluation Si true, fuerza una nueva evaluación aunque ya exista
 * @param delayBetweenActivities Delay en segundos entre cada evaluación de actividad (por defecto 0)
 * @returns Evaluación comprehensiva del fork
 */
export async function evaluateComprehensiveForkWithPersistence(
  originalRepoUrl: string,
  forkUrl: string,
  studentName: string,
  activities: ActivitySolution[],
  evaluatedBy: string,
  githubToken: string,
  forceReEvaluation: boolean = false,
  delayBetweenActivities: number = 0
): Promise<ComprehensiveForkEvaluation> {
  // Verificar si ya existe una evaluación
  if (!forceReEvaluation) {
    const existingEvaluation = await getExistingEvaluation(originalRepoUrl, forkUrl, githubToken);
    if (existingEvaluation) {
      return existingEvaluation;
    }
  }
  
  // Realizar nueva evaluación con delay configurable
  const evaluation = await evaluateComprehensiveFork(forkUrl, studentName, activities, githubToken, delayBetweenActivities);
  
  // Guardar la evaluación
  const saved = await saveEvaluationToRepository(
    originalRepoUrl,
    forkUrl,
    evaluation,
    evaluatedBy,
    githubToken
  );
  
  if (!saved) {
    console.warn('No se pudo guardar la evaluación en el repositorio');
  }
  
  // Agregar metadatos de persistencia
  return {
    ...evaluation,
    evaluatedAt: new Date().toISOString(),
    evaluatedBy
  };
}