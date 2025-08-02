'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {  
  ComprehensiveForkEvaluation,
  ActivitySolution,
  IndividualActivityEvaluation,
  evaluateComprehensiveForkWithPersistence,  
  reEvaluateIndividualActivity
} from '@/lib/gemini-github-evaluation';
import { generateForkEvaluationPDF, uploadPDFToRepository, generatePDFFileName } from '@/lib/github-fork-pdf-generator';
import { exportForksToExcel, generateExcelFileName } from '@/lib/github-fork-excel-exporter';

// Types for activity-solution mapping
export type ActivitiesMap =
  | { error: string }
  | ActivitySolution[];

interface GithubFork {
  id: number;
  full_name: string;
  html_url: string;
  stargazers_count: number;
  owner: {
    login: string;
  };
}

interface EstudianteInfo {
  identificacion: string;
  nombres: string;
  apellidos: string;
  grupo: string;
  error?: string;
}

// Decodificador base64 seguro para UTF-8
function decodeBase64Utf8(base64: string) {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = new Uint8Array([...binary].map(char => char.charCodeAt(0)));
  return new TextDecoder('utf-8').decode(bytes);
}

export default function GithubForksPage() {
  const [repo, setRepo] = useState('');
  const [forks, setForks] = useState<GithubFork[]>([])
  const [estudiantes, setEstudiantes] = useState<Record<number, EstudianteInfo | null>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activitiesMap, setActivitiesMap] = useState<ActivitiesMap | null>(null)
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [githubToken, setGithubToken] = useState('')
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [evaluations, setEvaluations] = useState<Record<number, ComprehensiveForkEvaluation>>({})
  const [evaluatingForks, setEvaluatingForks] = useState<Set<number>>(new Set())
  const [evaluatingActivities, setEvaluatingActivities] = useState<Set<string>>(new Set()) // Para actividades individuales
  const [originalRepoUrl, setOriginalRepoUrl] = useState<string>('')
  const [existingEvaluations, setExistingEvaluations] = useState<Record<string, ComprehensiveForkEvaluation>>({})
  const [loadingExistingEvaluations, setLoadingExistingEvaluations] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [generatingPDFs, setGeneratingPDFs] = useState<Set<number>>(new Set()) // Para manejar la generación de PDFs
  const [exportingExcel, setExportingExcel] = useState(false) // Para manejar la exportación a Excel
  const [showInstructions, setShowInstructions] = useState(false) // Para mostrar las indicaciones del repositorio
  const [bulkEvaluating, setBulkEvaluating] = useState(false) // Para manejar la evaluación masiva
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 }) // Progreso de evaluación masiva
  const [individualProgress, setIndividualProgress] = useState<Record<number, { current: number, total: number }>>({}) // Progreso individual por fork
  const [requestDelay, setRequestDelay] = useState(5) // Delay entre peticiones en segundos (mínimo 5, por defecto 5)
  // Removed activityDescription state as we'll use activities.json from original repo

  // Cargar token desde localStorage al montar el componente
  useEffect(() => {
    const savedToken = localStorage.getItem('github-token')
    if (savedToken) {
      setGithubToken(savedToken)
    }
  }, [])

  // Función para actualizar el token y guardarlo en localStorage
  const updateGithubToken = (token: string) => {
    setGithubToken(token)
    if (token.trim()) {
      localStorage.setItem('github-token', token)
    } else {
      localStorage.removeItem('github-token')
    }
  }

  // Obtener grupos únicos de los estudiantes
  const getUniqueGroups = (): string[] => {
    const groups = new Set<string>()
    Object.values(estudiantes).forEach(estudiante => {
      if (estudiante && !estudiante.error && estudiante.grupo) {
        groups.add(estudiante.grupo)
      }
    })
    return Array.from(groups).sort()
  }

  // Filtrar forks por grupo seleccionado
  const getFilteredForks = (): GithubFork[] => {
    if (selectedGroup === 'all') {
      return forks
    }
    return forks.filter(fork => {
      const estudiante = estudiantes[fork.id]
      return estudiante && !estudiante.error && estudiante.grupo === selectedGroup
    })
  };

  // Obtener forks que ya han sido evaluados
  const getEvaluatedForks = (): GithubFork[] => {
    return forks.filter(fork => {
      const evaluation = existingEvaluations[fork.full_name] || evaluations[fork.id];
      return !!evaluation;
    });
  };

  // Cargar evaluaciones existentes del repositorio original
  const loadExistingEvaluations = async (repoUrl: string, forksData?: GithubFork[]) => {
    if (!repoUrl) return;
    
    setLoadingExistingEvaluations(true);
    try {
      const { getPersistedEvaluations } = await import('@/lib/gemini-github-evaluation');
      const evaluations = await getPersistedEvaluations(repoUrl, githubToken || undefined);
      
      if (evaluations) {
        setExistingEvaluations(evaluations);
        
        // Cargar evaluaciones existentes en el estado local
        // Usar forksData si se proporciona, sino usar el estado actual
        const forksToProcess = forksData || forks;
        const localEvaluations: Record<number, ComprehensiveForkEvaluation> = {};
        forksToProcess.forEach(fork => {
          const existingEval = evaluations[fork.full_name];
          if (existingEval) {
            localEvaluations[fork.id] = existingEval;
          }
        });
        setEvaluations(localEvaluations);
      }
    } catch (error) {
      console.error('Error al cargar evaluaciones existentes:', error);
    } finally {
      setLoadingExistingEvaluations(false);
    }
  };

  // Verificar si un fork ya está evaluado
  const isEvaluated = (fork: GithubFork): boolean => {
    return !!existingEvaluations[fork.full_name] || !!evaluations[fork.id];
  };

  // Obtener la fecha de evaluación si existe
  const getEvaluationDate = (fork: GithubFork): string | null => {
    const existing = existingEvaluations[fork.full_name] || evaluations[fork.id];
    return existing?.evaluatedAt || null;
  };

  // Funciones para manejar la expansión/compresión de tarjetas
  const toggleCardExpansion = (forkId: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(forkId)) {
        newSet.delete(forkId);
      } else {
        newSet.add(forkId);
      }
      return newSet;
    });
  };

  const isCardExpanded = (forkId: number): boolean => {
    return expandedCards.has(forkId);
  };

  // Obtener la nota promedio para mostrar en la vista comprimida
  const getAverageScore = (fork: GithubFork): number | null => {
    const evaluation = existingEvaluations[fork.full_name] || evaluations[fork.id];
    return evaluation?.overallScore || null;
  };

  // Función para generar y subir PDF de evaluación
  const generateAndUploadPDF = async (fork: GithubFork, evaluation: ComprehensiveForkEvaluation) => {
    if (!githubToken || !originalRepoUrl) {
      console.error('Token de GitHub o URL del repositorio original no disponible');
      return false;
    }

    const forkId = fork.id;
    setGeneratingPDFs(prev => new Set(prev).add(forkId));

    try {
      // Generar PDF
      const pdfBuffer = generateForkEvaluationPDF(evaluation, fork.full_name);
      
      // Generar nombre del archivo
      const fileName = generatePDFFileName(fork.full_name, evaluation.studentName);
      
      // Subir PDF al repositorio original
      const success = await uploadPDFToRepository(
        originalRepoUrl,
        fileName,
        pdfBuffer,
        githubToken,
        `Agregar reporte de evaluación para ${evaluation.studentName} (${fork.full_name})`
      );

      if (success) {
        console.log(`PDF generado y subido exitosamente: ${fileName}`);
        return true;
      } else {
        console.error('Error al subir el PDF al repositorio');
        return false;
      }
    } catch (error) {
      console.error('Error al generar o subir PDF:', error);
      return false;
    } finally {
      setGeneratingPDFs(prev => {
        const newSet = new Set(prev);
        newSet.delete(forkId);
        return newSet;
      });
    }
  };

  // Función para exportar todas las evaluaciones a Excel
  const handleExportToExcel = async () => {
    setExportingExcel(true);
    
    try {
      // Obtener todos los forks evaluados
      const evaluatedForks = forks.filter(fork => {
        const evaluation = existingEvaluations[fork.full_name] || evaluations[fork.id];
        return !!evaluation;
      });

      if (evaluatedForks.length === 0) {
        alert('No hay forks evaluados para exportar');
        return;
      }

      // Preparar datos para exportación
      const exportData = evaluatedForks.map(fork => {
        const evaluation = existingEvaluations[fork.full_name] || evaluations[fork.id];
        const studentInfo = estudiantes[fork.id];
        
        return {
          fork,
          evaluation,
          studentInfo
        };
      });

      // Generar nombre del archivo
      const fileName = generateExcelFileName();
      
      // Exportar a Excel
      exportForksToExcel(exportData, fileName);
      
      console.log(`Excel exportado exitosamente: ${fileName}`);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al exportar a Excel: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setExportingExcel(false);
    }
  };

  // Función personalizada para evaluar fork con progreso
  const evaluateComprehensiveForkWithProgress = async (
    originalRepoUrl: string,
    forkUrl: string,
    studentName: string,
    activities: ActivitySolution[],
    evaluatedBy: string,
    githubToken: string,
    forceReEvaluation: boolean = false,
    onProgressUpdate?: (current: number, total: number) => void
  ): Promise<ComprehensiveForkEvaluation> => {
    // Importar funciones necesarias
    const { 
      getExistingEvaluation, 
      saveEvaluationToRepository, 
      evaluateIndividualActivity 
    } = await import('@/lib/gemini-github-evaluation');

    // Verificar si ya existe una evaluación y no se fuerza re-evaluación
    if (!forceReEvaluation) {
      const existingEvaluation = await getExistingEvaluation(originalRepoUrl, forkUrl, githubToken);
      if (existingEvaluation) {
        return existingEvaluation;
      }
    }

    const activityEvaluations: IndividualActivityEvaluation[] = [];
    
    // Evaluar cada actividad individualmente con progreso
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      
      // Actualizar progreso
      if (onProgressUpdate) {
        onProgressUpdate(i, activities.length);
      }
      
      const evaluation = await evaluateIndividualActivity(
        forkUrl,
        studentName,
        activity.activity,
        activity.solution,
        githubToken
      );
      activityEvaluations.push(evaluation);
      
      // Agregar delay configurable entre cada evaluación de actividad (excepto en la última)
      if (i < activities.length - 1) {
        await new Promise(resolve => setTimeout(resolve, requestDelay * 1000));
      }
    }

    // Progreso final
    if (onProgressUpdate) {
      onProgressUpdate(activities.length, activities.length);
    }

    // Calcular estadísticas generales
    const totalActivities = activities.length;
    const completedActivities = activityEvaluations.filter(evaluation => evaluation.fileFound && evaluation.score > 0).length;
    const totalScore = activityEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
    const overallScore = totalActivities > 0 ? totalScore / totalActivities : 0;

    // Generar resumen y recomendaciones (funciones helper simples)
    const summary = `Completó ${completedActivities}/${totalActivities} actividades con una calificación promedio de ${overallScore.toFixed(1)}/5.`;
    const recommendations = ['Continuar con el buen trabajo'];

    const comprehensiveEvaluation: ComprehensiveForkEvaluation = {
      repositoryUrl: forkUrl,
      studentName,
      activities: activityEvaluations,
      overallScore,
      totalActivities,
      completedActivities,
      summary,
      recommendations,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy
    };

    // Guardar la evaluación en el repositorio original
    await saveEvaluationToRepository(originalRepoUrl, forkUrl, comprehensiveEvaluation, evaluatedBy, githubToken);

    return comprehensiveEvaluation;
  };

  // Función para evaluar todos los forks filtrados con intervalos de 1 segundo
  const handleBulkEvaluateAllForks = async () => {
    if (!githubToken) {
      setError('Se requiere un token de GitHub para evaluar forks')
      return
    }

    if (!areActivitiesReady()) {
      if (loadingActivities) {
        setError('Las actividades aún se están cargando. Por favor espera un momento.')
      } else {
        setError('No se encontró información de actividades válida en activities.json del repositorio original')
      }
      return
    }

    const filteredForks = getFilteredForks()
    
    if (filteredForks.length === 0) {
      alert('No hay forks filtrados para evaluar')
      return
    }

    const confirmMessage = `¿Estás seguro de que quieres evaluar todos los ${filteredForks.length} forks filtrados? Esto incluye re-evaluar los que ya han sido evaluados.`
    if (!confirm(confirmMessage)) {
      return
    }

    setBulkEvaluating(true)
    setBulkProgress({ current: 0, total: filteredForks.length })
    setError('')

    try {
      for (let i = 0; i < filteredForks.length; i++) {
        const fork = filteredForks[i]
        setBulkProgress({ current: i + 1, total: filteredForks.length })

        try {
          const studentInfo = estudiantes[fork.id]
          const studentName = studentInfo && !studentInfo.error 
            ? `${studentInfo.nombres || ''} ${studentInfo.apellidos || ''}`.trim() || 'Estudiante desconocido'
            : 'Estudiante desconocido'

          const repoUrl = fork.full_name

          // Evaluar el fork
          const evaluation = await evaluateComprehensiveForkWithPersistence(
            originalRepoUrl!,
            repoUrl,
            studentName,
            activitiesMap as ActivitySolution[],
            'Sistema de Evaluación Masiva',
            githubToken,
            true, // Forzar re-evaluación para evaluación masiva
            requestDelay // Agregar delay configurable entre actividades
          )

          // Actualizar estados locales
          setEvaluations(prev => ({
            ...prev,
            [fork.id]: evaluation
          }))

          setExistingEvaluations(prev => ({
            ...prev,
            [repoUrl]: evaluation
          }))

          // Generar y subir PDF del reporte
          await generateAndUploadPDF(fork, evaluation)

        } catch (error) {
          console.error(`Error al evaluar fork ${fork.full_name}:`, error)
          
          // Manejo específico de errores de cuota de Gemini API
          if (error instanceof Error && error.message.includes('429')) {
            const quotaError = `⚠️ Límite de cuota de Gemini API alcanzado (200 solicitudes/día en plan gratuito). 
            
Opciones:
• Esperar hasta mañana (se reinicia a medianoche hora del Pacífico)
• Actualizar a plan de pago para obtener más cuota
• Aumentar el delay entre evaluaciones para conservar cuota

Evaluación detenida en fork ${i + 1} de ${filteredForks.length}.`
            
            setError(quotaError)
            alert(quotaError)
            break // Detener la evaluación masiva
          }
          
          // Continuar con el siguiente fork en caso de otros errores
        }
      }

      alert(`Evaluación masiva completada. Se evaluaron ${filteredForks.length} forks.`)
    } catch (error) {
      console.error('Error en evaluación masiva:', error)
      setError('Error en evaluación masiva: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setBulkEvaluating(false)
      setBulkProgress({ current: 0, total: 0 })
    }
  }

  // Función para re-evaluar una actividad individual
  // Helper function to check if activities are ready for evaluation
  const areActivitiesReady = () => {
    return !loadingActivities && 
           activitiesMap && 
           !('error' in activitiesMap) && 
           Array.isArray(activitiesMap) && 
           activitiesMap.length > 0;
  };

  const handleReEvaluateActivity = async (fork: GithubFork, activityIndex: number) => {
    if (!githubToken) {
      setError('Se requiere un token de GitHub para evaluar actividades')
      return
    }

    if (!areActivitiesReady()) {
      if (loadingActivities) {
        setError('Las actividades aún se están cargando. Por favor espera un momento.')
      } else {
        setError('No se encontró información de actividades válida en activities.json del repositorio original')
      }
      return
    }

    const activityKey = `${fork.id}-${activityIndex}`
    
    // Evitar re-evaluaciones múltiples de la misma actividad
    if (evaluatingActivities.has(activityKey)) {
      return
    }

    setEvaluatingActivities(prev => new Set(prev).add(activityKey))
    setError('')

    try {
      const studentName = estudiantes[fork.id]?.nombres && estudiantes[fork.id]?.apellidos 
        ? `${estudiantes[fork.id]?.nombres} ${estudiantes[fork.id]?.apellidos}`
        : fork.owner?.login || 'Estudiante desconocido'

      // Agregar delay configurable antes de hacer la evaluación
      await new Promise(resolve => setTimeout(resolve, requestDelay * 1000))

      const updatedEvaluation = await reEvaluateIndividualActivity(
        originalRepoUrl!,
        fork.full_name,
        studentName,
        activityIndex,
        activitiesMap as ActivitySolution[],
        githubToken
      )

      if (updatedEvaluation) {
        // Actualizar las evaluaciones locales
        setEvaluations(prev => ({
          ...prev,
          [fork.id]: updatedEvaluation
        }))

        // Actualizar las evaluaciones existentes
        setExistingEvaluations(prev => ({
          ...prev,
          [fork.full_name]: updatedEvaluation
        }))

        // Generar y subir PDF del reporte
        await generateAndUploadPDF(fork, updatedEvaluation);
      } else {
        setError('Error al re-evaluar la actividad')
      }
    } catch (error) {
      console.error('Error al re-evaluar actividad:', error)
      
      // Manejo específico de errores de cuota de Gemini API
      if (error instanceof Error && error.message.includes('429')) {
        const quotaError = `⚠️ Límite de cuota de Gemini API alcanzado (200 solicitudes/día en plan gratuito).

Opciones:
• Esperar hasta mañana (se reinicia a medianoche hora del Pacífico)
• Actualizar a plan de pago para obtener más cuota  
• Aumentar el delay entre evaluaciones para conservar cuota`
        
        setError(quotaError)
      } else {
        setError('Error al re-evaluar la actividad: ' + (error instanceof Error ? error.message : 'Error desconocido'))
      }
    } finally {
      setEvaluatingActivities(prev => {
        const newSet = new Set(prev)
        newSet.delete(activityKey)
        return newSet
      })
    }
  }

  const handleEvaluateFork = async (fork: GithubFork, forceReEvaluation: boolean = false) => {
    if (!githubToken) {
      setError('Se requiere un token de GitHub para evaluar forks')
      return
    }

    if (!areActivitiesReady()) {
      if (loadingActivities) {
        setError('Las actividades aún se están cargando. Por favor espera un momento.')
      } else {
        setError('No se encontró información de actividades válida en activities.json del repositorio original')
      }
      return
    }

    const forkId = fork.id;
    setEvaluatingForks(prev => new Set(prev).add(forkId));
    
    // Inicializar progreso individual
    const totalActivities = (activitiesMap as ActivitySolution[]).length;
    setIndividualProgress(prev => ({
      ...prev,
      [forkId]: { current: 0, total: totalActivities }
    }));

    try {
      const studentInfo = estudiantes[forkId];
      const studentName = studentInfo && !studentInfo.error 
        ? `${studentInfo.nombres || ''} ${studentInfo.apellidos || ''}`.trim() || 'Estudiante desconocido'
        : 'Estudiante desconocido';

      const repoUrl = fork.full_name; // formato: "owner/repo"
      
      // Agregar delay configurable antes de hacer la evaluación
      await new Promise(resolve => setTimeout(resolve, requestDelay * 1000))
      
      // Función de callback para actualizar progreso
      const onProgressUpdate = (current: number, total: number) => {
        setIndividualProgress(prev => ({
          ...prev,
          [forkId]: { current, total }
        }));
      };
      
      // Usar función personalizada con progreso
      const evaluation = await evaluateComprehensiveForkWithProgress(
        originalRepoUrl!, // Repositorio original
        repoUrl, // Fork a evaluar
        studentName,
        activitiesMap as ActivitySolution[], // Pass all activities from activities.json
        'Sistema de Evaluación', // evaluatedBy
        githubToken,
        forceReEvaluation, // Forzar re-evaluación si es necesario
        onProgressUpdate // Callback de progreso
      );

      setEvaluations(prev => ({
        ...prev,
        [forkId]: evaluation
      }));

      // Actualizar evaluaciones existentes
      setExistingEvaluations(prev => ({
        ...prev,
        [repoUrl]: evaluation
      }));

      // Generar y subir PDF del reporte
      await generateAndUploadPDF(fork, evaluation);

    } catch (error) {
      console.error('Error al evaluar fork:', error);
      
      // Manejo específico de errores de cuota de Gemini API
      if (error instanceof Error && error.message.includes('429')) {
        const quotaError = `⚠️ Límite de cuota de Gemini API alcanzado (200 solicitudes/día en plan gratuito).

Opciones:
• Esperar hasta mañana (se reinicia a medianoche hora del Pacífico)  
• Actualizar a plan de pago para obtener más cuota
• Aumentar el delay entre evaluaciones para conservar cuota`
        
        setError(quotaError)
        alert(quotaError)
      } else {
        alert(`Error al evaluar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    } finally {
      setEvaluatingForks(prev => {
        const newSet = new Set(prev);
        newSet.delete(forkId);
        return newSet;
      });
      
      // Limpiar progreso individual
      setIndividualProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[forkId];
        return newProgress;
      });
    }
  };

  // Helper para generar headers de autenticación
  const getAuthHeaders = () => {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (githubToken.trim()) {
      headers['Authorization'] = `token ${githubToken.trim()}`;
    }
    
    return headers;
  };

  const fetchEstudianteInfo = async (fork: GithubFork): Promise<EstudianteInfo | null> => {
    try {
      const res = await fetch(`https://api.github.com/repos/${fork.full_name}/contents/info.json`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('No encontrado');
      const data = await res.json();
      if (!data.content) throw new Error('Sin contenido');
      const decoded = decodeBase64Utf8(data.content);
      return JSON.parse(decoded);
    } catch {
      return { identificacion: '', nombres: '', apellidos: '', grupo: '', error: 'No encontrado o inválido' };
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setForks([]);
    setEstudiantes({});
    setActivitiesMap(null);
    setLoadingActivities(true);
    setEvaluations({});
    setExistingEvaluations({});
    
    let activitiesData: ActivitySolution[] | { error: string } | null = null;
    
    try {
      // Permitir pegar la URL completa o owner/repo
      let repoPath = repo.trim();
      console.log('Entrada original:', repoPath);
      
      // Si es una URL, extraer owner/repo
      const match = repoPath.match(/github\.com[\/:]([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/i);
      if (match) {
        repoPath = `${match[1]}/${match[2]}`;
        console.log('URL detectada, extraído:', repoPath);
      }
      
      // Limpiar caracteres especiales al final
      repoPath = repoPath.replace(/\/$/, ''); // Remover slash final
      repoPath = repoPath.replace(/\.git$/, ''); // Remover .git al final si quedó
      console.log('Ruta final del repositorio:', repoPath);
      
      if (!repoPath.includes('/')) throw new Error('Formato inválido. Usa owner/repo o la URL del repositorio.');

      // Guardar la URL del repositorio original
      setOriginalRepoUrl(repoPath);

      // Leer activities.json del repo original PRIMERO
      try {
        const activitiesRes = await fetch(`https://api.github.com/repos/${repoPath}/contents/activities.json`, {
          headers: getAuthHeaders()
        });
        if (activitiesRes.status === 403) {
          const errorData = await activitiesRes.json();
          if (errorData.message && errorData.message.includes('rate limit')) {
            const suggestion = githubToken 
              ? 'Límite de API excedido incluso con token. Espera unos minutos.' 
              : 'Límite de API excedido. Configura un Personal Access Token para aumentar el límite a 5,000/hora.';
            throw new Error(`⚠️ ${suggestion}`);
          }
        }
        if (!activitiesRes.ok) throw new Error('No encontrado');
        const activitiesResponseData = await activitiesRes.json();
        if (!activitiesResponseData.content) throw new Error('Sin contenido');
        const activitiesDecoded = decodeBase64Utf8(activitiesResponseData.content);
        activitiesData = JSON.parse(activitiesDecoded);
        console.log('Activities.json cargado exitosamente:', activitiesData);
      } catch (activityError) {
        if (activityError instanceof Error && activityError.message.includes('límite de API')) {
          throw activityError; // Re-lanzar errores de límite de API
        }
        activitiesData = { error: 'No se pudo leer activities.json' };
        console.log('Error cargando activities.json:', activityError);
      }

      const res = await fetch(`https://api.github.com/repos/${repoPath}/forks`, {
        headers: getAuthHeaders()
      });
      console.log('URL de la API:', `https://api.github.com/repos/${repoPath}/forks`);
      console.log('Status de respuesta:', res.status);
      
      // Verificar específicamente errores de cuota de API
      if (res.status === 403) {
        const errorData = await res.json();
        if (errorData.message && errorData.message.includes('rate limit')) {
          const suggestion = githubToken 
            ? 'Límite de API excedido incluso con token. Espera unos minutos.' 
            : 'Límite de API excedido. Configura un Personal Access Token para aumentar el límite a 5,000/hora.';
          throw new Error(`⚠️ ${suggestion}`);
        } else if (errorData.message && errorData.message.includes('Forbidden')) {
          throw new Error('❌ Acceso denegado. El repositorio puede ser privado o no existe.');
        }
      } else if (res.status === 404) {
        throw new Error(`❌ Repository '${repoPath}' not found. Please verify that:\n• The repository name is correct\n• The repository is public\n• The format is owner/repo (e.g: facebook/react)`);
      } else if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`❌ Error ${res.status}: ${errorData.message || 'No se pudo obtener los forks'}`);
      }

      const data: GithubFork[] = await res.json();
      setForks(data);
      
      // Establecer las actividades DESPUÉS de cargar los forks pero ANTES de cargar info de estudiantes
      setActivitiesMap(activitiesData);
      console.log('ActivitiesMap establecido en el estado:', activitiesData);
      
      // Buscar info.json para cada fork
      const estudiantesData: Record<number, EstudianteInfo | null> = {};
      await Promise.all(
        data.map(async (fork) => {
          const info = await fetchEstudianteInfo(fork);
          estudiantesData[fork.id] = info;
        })
      );
      setEstudiantes(estudiantesData);

      // Cargar evaluaciones existentes después de obtener los forks
      await loadExistingEvaluations(repoPath, data);
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido');
      }
    } finally {
      setLoading(false);
      // Establecer loadingActivities a false al final, después de todas las operaciones
      setLoadingActivities(false);
    }
  };

  return (
    <div className="w-full px-2 md:px-8 py-8">
      <h1 className="text-2xl font-bold mb-4">Evaluador de Repositorios GitHub</h1>
      
      {/* Información sobre límites de API */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Información sobre la API de GitHub</h3>
        <p className="text-sm text-blue-700 mb-2">
          <strong>Sin token:</strong> 60 solicitudes por hora | <strong>Con token:</strong> 5,000 solicitudes por hora
        </p>
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            🔑 {githubToken ? '✓ Token configurado' : 'Configurar Token de GitHub'}
            {githubToken && <span className="text-xs bg-green-500 px-2 py-1 rounded-full">Guardado</span>}
          </button>
          
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
          >
            📋 Indicaciones para Repositorio
          </button>

          {/* Input para configurar el delay entre peticiones */}
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
            <label className="text-sm font-medium text-orange-800 whitespace-nowrap">
              ⏱️ Delay (seg):
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={requestDelay}
              onChange={(e) => setRequestDelay(Math.max(5, parseInt(e.target.value) || 5))}
              className="w-16 border border-orange-300 rounded px-2 py-1 text-sm text-center"
              title="Tiempo de espera entre cada pregunta/actividad (mínimo 5 segundos)"
            />
            <span className="text-xs text-orange-600">min: 5s</span>
          </div>
          
          {/* Información sobre límites de Gemini API */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
            <div className="text-xs text-yellow-800">
              <span className="font-medium">⚠️ Gemini API:</span> Plan gratuito = 200 solicitudes/día
            </div>
            <div className="text-xs text-yellow-700 mt-1">
              Cada actividad = 1 solicitud. Aumenta el delay si alcanzas el límite.
            </div>
          </div>
        </div>
        
        {showTokenInput && (
          <div className="bg-white border border-blue-200 rounded p-3 mb-2">
            <label className="block text-sm font-medium text-blue-800 mb-1">
              Personal Access Token (Classic):
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={githubToken}
                onChange={(e) => updateGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              {githubToken && (
                <button
                  onClick={() => updateGithubToken('')}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  title="Limpiar token"
                >
                  🗑️
                </button>
              )}
            </div>
            <p className="text-xs text-blue-600 mt-1">
                Crea tu token en: <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline">GitHub Settings → Developer settings → Personal access tokens</a>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                🔒 El token se guarda localmente en tu navegador y persiste entre sesiones.
              </p>
          </div>
        )}

        {showInstructions && (
          <div className="bg-white border border-purple-200 rounded p-4 mb-2">
            <h4 className="font-semibold text-purple-800 mb-3">📋 Indicaciones para crear un repositorio compatible</h4>
            
            <div className="space-y-4 text-sm">
              <div>
                <h5 className="font-medium text-purple-700 mb-2">🏗️ Estructura del repositorio:</h5>
                <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                  <div>mi-proyecto-python/</div>
                  <div>├── activities.json <span className="text-green-600">(OBLIGATORIO)</span></div>
                  <div>├── info.json <span className="text-blue-600">(plantilla para estudiantes)</span></div>
                  <div>├── README.md</div>
                  <div>├── reports/ <span className="text-gray-500">(se crea automáticamente)</span></div>
                  <div>└── src/</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;├── ejercicio_01.py</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;├── ejercicio_02.py</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;└── ejercicio_03.py</div>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-purple-700 mb-2">📄 Archivo activities.json (OBLIGATORIO):</h5>
                <p className="text-gray-600 mb-2">Este archivo debe estar en la raíz del repositorio original y contiene las actividades a evaluar:</p>
                <div className="bg-gray-50 p-3 rounded">
                  <pre className="text-xs overflow-x-auto">{`[
  {
    "activity": "Usando un ciclo for, imprime los números enteros del 0 al 9, cada uno en una línea.",
    "solution": "src/ejercicio_01.py"
  },
  {
    "activity": "Mediante un ciclo while, imprime los números enteros del 10 al 1 en orden descendente, cada número en una línea.",
    "solution": "src/ejercicio_02.py"
  },
  {
    "activity": "Crea una función que reciba una lista de números y retorne la suma de todos los elementos.",
    "solution": "src/ejercicio_03.py"
  }
]`}</pre>
                </div>
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <h6 className="font-medium text-yellow-800 text-xs mb-1">📝 Cómo diligenciar activities.json:</h6>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• <strong>activity:</strong> Descripción clara y específica de lo que debe hacer el estudiante</li>
                    <li>• <strong>solution:</strong> Ruta relativa al archivo donde debe estar la solución (desde la raíz del repositorio)</li>
                    <li>• Usar comillas dobles para todas las cadenas de texto</li>
                    <li>• Separar cada actividad con coma, excepto la última</li>
                    <li>• La ruta del archivo debe coincidir exactamente con la ubicación real</li>
                  </ul>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-purple-700 mb-2">👥 Archivo info.json en cada fork (OBLIGATORIO):</h5>
                <p className="text-gray-600 mb-2">Cada estudiante debe crear este archivo en la raíz de su fork:</p>
                <div className="bg-gray-50 p-3 rounded">
                  <pre className="text-xs overflow-x-auto">{`{
  "identificacion": "12345678",
  "nombres": "Juan Carlos",
  "apellidos": "Pérez García",
  "grupo": "A1"
}`}</pre>
                </div>
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                  <h6 className="font-medium text-orange-800 text-xs mb-1">📝 Cómo diligenciar info.json:</h6>
                  <ul className="text-xs text-orange-700 space-y-1">
                    <li>• <strong>identificacion:</strong> Número de documento o código estudiantil (sin puntos ni espacios)</li>
                    <li>• <strong>nombres:</strong> Nombres completos del estudiante</li>
                    <li>• <strong>apellidos:</strong> Apellidos completos del estudiante</li>
                    <li>• <strong>grupo:</strong> Código del grupo o sección (ej: &quot;A1&quot;, &quot;B2&quot;, &quot;Grupo1&quot;)</li>
                    <li>• Usar comillas dobles para todos los valores</li>
                    <li>• No agregar comas después del último campo</li>
                  </ul>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-purple-700 mb-2">📁 Carpeta reports/:</h5>
                <p className="text-gray-600">
                  • Se crea automáticamente cuando se generan evaluaciones<br/>
                  • Contiene los PDFs de evaluación de cada estudiante<br/>
                  • No requiere configuración manual
                </p>
              </div>

              <div>
                <h5 className="font-medium text-purple-700 mb-2">💡 Consejos para definir actividades:</h5>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• <strong>Descripción clara:</strong> Especifica exactamente qué debe hacer el estudiante</li>
                    <li>• <strong>Rutas precisas:</strong> Verifica que las rutas de archivos sean correctas</li>
                    <li>• <strong>Organización:</strong> Agrupa archivos relacionados en carpetas (ej: src/, ejercicios/)</li>
                    <li>• <strong>Nomenclatura:</strong> Usa nombres descriptivos para los archivos de solución</li>
                    <li>• <strong>Extensiones:</strong> Incluye la extensión correcta (.py, .js, .java, etc.)</li>
                    <li>• <strong>Orden lógico:</strong> Ordena las actividades de menor a mayor complejidad</li>
                  </ul>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-purple-700 mb-2">✅ Pasos para el profesor:</h5>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Crear el repositorio base con <code>activities.json</code> e <code>info.json</code> (como plantilla)</li>
                  <li>Compartir el repositorio con los estudiantes</li>
                  <li>Los estudiantes hacen fork del repositorio</li>
                  <li>Los estudiantes completan sus datos en <code>info.json</code></li>
                  <li>Los estudiantes completan las actividades en los archivos especificados</li>
                  <li>Usar esta herramienta para buscar y evaluar los forks</li>
                </ol>
              </div>

              <div>
                <h5 className="font-medium text-purple-700 mb-2">⚠️ Requisitos importantes:</h5>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>El repositorio debe ser público</li>
                  <li><code>activities.json</code> debe estar en la raíz del repositorio original</li>
                  <li><code>info.json</code> debe estar en la raíz del repositorio original como plantilla</li>
                  <li>Los estudiantes deben completar sus datos en <code>info.json</code> después del fork</li>
                  <li>Los nombres de archivos son sensibles a mayúsculas/minúsculas</li>
                  <li>El formato JSON debe ser válido</li>
                </ul>
              </div>

             
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          className="border rounded px-2 py-1 flex-1"
          placeholder="URL completa o owner/repo (ej: https://github.com/vercel/next.js)"
          value={repo}
          onChange={e => setRepo(e.target.value)}
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="text-red-700 font-medium">Error:</div>
          <div className="text-red-600">{error}</div>
          {error.includes('límite de API') && (
            <div className="text-sm text-red-500 mt-2">
              💡 <strong>Sugerencia:</strong> {githubToken 
                ? 'Incluso con token, el límite se ha excedido. Espera 10-15 minutos antes de intentar nuevamente.' 
                : 'Configura un Personal Access Token arriba para aumentar el límite de 60 a 5,000 solicitudes por hora.'}
            </div>
          )}
        </div>
      )}
      
      {/* Forks encontrados - ahora ocupa todo el ancho */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">
            Forks encontrados 
            {forks.length > 0 && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({getFilteredForks().length} de {forks.length})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {/* Botón de evaluación masiva */}
            {getFilteredForks().length > 0 && githubToken && areActivitiesReady() && (
              <button
                onClick={handleBulkEvaluateAllForks}
                disabled={bulkEvaluating || loadingExistingEvaluations}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  bulkEvaluating || loadingExistingEvaluations
                    ? 'bg-yellow-100 text-yellow-700 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {bulkEvaluating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                    Evaluando...
                  </>
                ) : (
                  <>
                    🚀 Evaluar Todos los Filtrados
                  </>
                )}
              </button>
            )}
            
            {/* Botón de exportación a Excel */}
            {getEvaluatedForks().length > 0 && (
              <button
                onClick={handleExportToExcel}
                disabled={exportingExcel}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  exportingExcel
                    ? 'bg-green-100 text-green-700 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {exportingExcel ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    Exportando...
                  </>
                ) : (
                  <>
                    📊 Exportar Excel
                  </>
                )}
              </button>
            )}
            
            {/* Filtro por grupo */}
            {getUniqueGroups().length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filtrar por grupo:</label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los grupos</SelectItem>
                    {getUniqueGroups().map(group => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Barra de progreso para evaluación masiva */}
        {bulkEvaluating && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">
                Evaluando forks ({bulkProgress.current} de {bulkProgress.total})
              </span>
              <span className="text-sm text-purple-600">
                {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-purple-600 mt-2">
              Evaluando con {requestDelay} segundos de espera entre cada pregunta/actividad (límites API Gemini)
            </p>
            <p className="text-xs text-green-600 mt-1">
              💡 Optimizando cuota: contenido vacío o insignificante se califica automáticamente con 0 (sin usar API)
            </p>
          </div>
        )}
        
        {/* Indicador de carga de evaluaciones existentes */}
        {loadingExistingEvaluations && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">Cargando evaluaciones existentes...</span>
            </div>
          </div>
        )}
        
        {/* Tarjetas de forks apiladas verticalmente */}
        <div className="space-y-4">
            {getFilteredForks().map(fork => {
              const isExpanded = isCardExpanded(fork.id);
              const averageScore = getAverageScore(fork);
              
              return (
                <Card key={fork.id} className="transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {estudiantes[fork.id] && !estudiantes[fork.id]?.error ? (
                            estudiantes[fork.id]?.nombres && estudiantes[fork.id]?.apellidos ? (
                              `${estudiantes[fork.id]?.nombres} ${estudiantes[fork.id]?.apellidos}`
                            ) : (
                              "Sin nombre disponible"
                            )
                          ) : (
                            "Cargando información..."
                          )}
                        </CardTitle>
                        
                        {/* Vista comprimida - información básica */}
                        <div className="mt-2 space-y-1">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">ID:</span> {estudiantes[fork.id]?.identificacion || 'No disponible'}
                          </div>
                          {averageScore !== null && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">Nota promedio:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                averageScore >= 4.0 ? 'bg-green-100 text-green-800' :
                                averageScore >= 3.0 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {averageScore.toFixed(1)}/5.0
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Botón de expansión */}
                      <button
                        onClick={() => toggleCardExpansion(fork.id)}
                        className="ml-4 p-2 rounded-md hover:bg-gray-100 transition-colors"
                        aria-label={isExpanded ? "Comprimir tarjeta" : "Expandir tarjeta"}
                      >
                        <svg 
                          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </CardHeader>
                  
                  {/* Contenido expandible */}
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <CardDescription>
                          <a href={fork.html_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                            {fork.full_name}
                          </a>
                        </CardDescription>
                        
                        {estudiantes[fork.id] ? (
                          estudiantes[fork.id]?.error ? (
                            <div className="text-red-500 text-sm">Error: {estudiantes[fork.id]?.error}</div>
                          ) : (
                            <>
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Grupo:</span> {estudiantes[fork.id]?.grupo || 'No disponible'}
                              </div>
                            </>
                          )
                        ) : (
                          <div className="text-gray-400 text-sm">Buscando información del estudiante...</div>
                        )}
                        <div className="text-sm text-gray-600 pt-2 border-t">
                          <span className="font-medium">Owner:</span> {fork.owner?.login}
                        </div>
                        
                        {/* Botón de evaluación con IA */}
                        <div className="pt-3 border-t">
                          {/* Mostrar estado de evaluación existente */}
                          {isEvaluated(fork) && (
                            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-blue-700">
                                  ✅ Evaluado el {getEvaluationDate(fork)}
                                </span>
                                <span className="text-xs text-blue-600 font-medium">
                                  📄 PDF generado en /reports
                                </span>
                              </div>
                            </div>
                          )}
                          
                          <button
                            onClick={() => handleEvaluateFork(fork, isEvaluated(fork))}
                            disabled={evaluatingForks.has(fork.id) || generatingPDFs.has(fork.id) || !areActivitiesReady()}
                            className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              evaluatingForks.has(fork.id) || generatingPDFs.has(fork.id)
                                ? 'bg-yellow-100 text-yellow-700 cursor-not-allowed'
                                : !areActivitiesReady()
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : isEvaluated(fork)
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : evaluations[fork.id]
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {evaluatingForks.has(fork.id) ? (
                              <>🔄 Evaluando con IA...</>
                            ) : generatingPDFs.has(fork.id) ? (
                              <>📄 Generando PDF...</>
                            ) : !areActivitiesReady() ? (
                              loadingActivities ? <>⏳ Cargando actividades...</> : <>⚠️ Actividades no disponibles</>
                            ) : isEvaluated(fork) ? (
                              <>🔄 Re-evaluar con IA</>
                            ) : evaluations[fork.id] ? (
                              <>✅ Ver evaluación</>
                            ) : (
                              <>🤖 Evaluar con IA</>
                            )}
                          </button>
                          
                          {/* Barra de progreso individual */}
                          {individualProgress[fork.id] && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-blue-700">
                                  Evaluando actividad {individualProgress[fork.id].current} de {individualProgress[fork.id].total}
                                </span>
                                <span className="text-xs text-blue-600">
                                  {Math.round((individualProgress[fork.id].current / individualProgress[fork.id].total) * 100)}%
                                </span>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${(individualProgress[fork.id].current / individualProgress[fork.id].total) * 100}%` 
                                  }}
                                ></div>
                              </div>
                              <div className="text-xs text-blue-600 mt-1 text-center">
                                Evaluando con {requestDelay} segundos de espera entre cada pregunta/actividad (límites API Gemini)
                              </div>
                              <div className="text-xs text-green-600 mt-1 text-center">
                                💡 Contenido vacío se califica automáticamente con 0 (ahorra cuota API)
                              </div>
                            </div>
                          )}
                          
                          {!areActivitiesReady() && (
                            <p className="text-xs text-blue-500 mt-1 text-center">
                              {loadingActivities ? (
                                <>⏳ Cargando activities.json...</>
                              ) : (
                                <>Busca un repositorio con activities.json para habilitar la evaluación</>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Mostrar resultados de evaluación */}
                        {evaluations[fork.id] && (
                          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-sm text-gray-800">📊 Evaluación IA</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                evaluations[fork.id].overallScore >= 4.0 ? 'bg-green-100 text-green-800' :
                                evaluations[fork.id].overallScore >= 3.0 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                Promedio: {evaluations[fork.id].overallScore.toFixed(1)}/5.0
                              </span>
                            </div>
                            
                            {/* Estadísticas generales */}
                            <div className="mb-3 p-2 bg-white rounded border">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-700">Actividades completadas:</span>
                                <span className="font-medium">{evaluations[fork.id].completedActivities}/{evaluations[fork.id].totalActivities}</span>
                              </div>
                            </div>
                            
                            {/* Lista de actividades evaluadas */}
                            <div className="space-y-3 mb-4">
                              <p className="text-xs font-medium text-gray-700 mb-2">Actividades evaluadas:</p>
                              <div className="space-y-3">
                                {evaluations[fork.id].activities.map((activity, idx) => {
                                  const activityKey = `${fork.id}-${idx}`;
                                  const isEvaluatingActivity = evaluatingActivities.has(activityKey);
                                  
                                  return (
                                    <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 mr-3">
                                          <p className="text-sm font-medium text-gray-800 mb-2 leading-relaxed">
                                            {idx + 1}. {activity.activityDescription}
                                          </p>
                                          <p className="text-xs text-gray-600 mb-2">
                                            📁 <span className="font-medium">{activity.solutionFile}</span>
                                          </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                                            activity.score >= 4.0 ? 'bg-green-100 text-green-700' :
                                            activity.score >= 3.0 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                          }`}>
                                            {activity.score.toFixed(1)}/5.0
                                          </span>
                                          <span className={`text-xs px-2 py-1 rounded ${
                                            activity.fileFound ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                          }`}>
                                            {activity.fileFound ? '✓ Encontrado' : '✗ No encontrado'}
                                          </span>
                                          {/* Botón de re-evaluación individual */}
                          <button
                            onClick={() => handleReEvaluateActivity(fork, idx)}
                            disabled={isEvaluatingActivity || generatingPDFs.has(fork.id) || !areActivitiesReady()}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              isEvaluatingActivity || generatingPDFs.has(fork.id)
                                ? 'bg-yellow-100 text-yellow-700 cursor-not-allowed'
                                : !areActivitiesReady()
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                            title="Re-evaluar solo esta actividad"
                          >
                            {isEvaluatingActivity ? '🔄' : generatingPDFs.has(fork.id) ? '📄' : !areActivitiesReady() ? '⏳' : '🔄 Re-evaluar'}
                          </button>
                                        </div>
                                      </div>
                                      
                                      {activity.feedback && activity.feedback.trim() && (
                                         <div className="mt-3 pt-3 border-t border-gray-100">
                                           <p className="text-xs font-medium text-gray-700 mb-2">Retroalimentación:</p>
                                           <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                                             {activity.feedback}
                                           </p>
                                         </div>
                                       )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            <div className="space-y-3 pt-3 border-t border-gray-200">
                              <div>
                                <p className="text-xs font-medium text-gray-700 mb-2">Resumen general:</p>
                                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                                  {evaluations[fork.id].summary}
                                </p>
                              </div>
                              
                              {evaluations[fork.id].recommendations.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-700 mb-2">Recomendaciones generales:</p>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {evaluations[fork.id].recommendations.map((rec, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                                        <span className="leading-relaxed">{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            {getFilteredForks().length === 0 && forks.length > 0 && selectedGroup !== 'all' && (
              <div className="text-gray-400 text-sm text-center py-8">No se encontraron forks para el grupo &quot;{selectedGroup}&quot;.</div>
            )}
            {forks.length === 0 && (
              <div className="text-gray-400 text-sm text-center py-8">No se han encontrado forks.</div>
            )}
          </div>
        </div>
      </div>
   
  );
}