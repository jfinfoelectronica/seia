'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toUTC, isBeforeUTC, isAfterUTC } from '@/lib/date-utils'
import { CodeEditor } from '@/app/student/evaluation/components/code-editor'
import { SecureTextarea } from '@/app/student/evaluation/components/secure-textarea'
import { MarkdownViewer } from '@/app/student/evaluation/components/markdown-viewer'
import { LANGUAGE_OPTIONS } from '@/lib/constants/languages'
import devtools from 'devtools-detect';

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Clock, HelpCircle, Loader2, Send, Sparkles, XCircle, PenTool } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import ThemeToggle from '@/components/theme/ThemeToggle'
import { cn } from '@/lib/utils'

// Servicios para evaluar con Gemini AI
import { getAIFeedback } from '@/lib/gemini-code-evaluation';
import { evaluateTextResponse } from '@/lib/gemini-text-evaluation';

// Tipos para los modelos de datos
type Question = {
  id: number
  text: string
  type: string
  answer?: string | null
  helpUrl?: string | null
}

type Answer = {
  questionId: number
  answer: string
  score?: number | null
  evaluated: boolean
  timeOutsideEval?: number
}

type EvaluationData = {
  id: number
  title: string
  description?: string
  helpUrl?: string
  questions: Question[]
  startTime: Date
  endTime: Date
}

// Los datos de evaluación ahora se cargan desde la base de datos

import { useFraudDetection } from './hooks/useFraudDetection';
import { useInputSecurity } from './hooks/useInputSecurity';
import { TimeTrackingAlert } from './components/fraud-alert';
import { submitEvaluation } from './actions';

import { useEvaluationTimer } from '../hooks/useEvaluationTimer';
import { EvaluationTimer } from '../components/EvaluationTimer';
import { useQuestionNavigation } from '../hooks/useQuestionNavigation';
import { useStudentData } from '../hooks/useStudentData';
import { useThemeManagement } from '../hooks/useThemeManagement';
import { usePageVisibility } from '../hooks/usePageVisibility';
import { useDevToolsProtection } from '../hooks/useDevToolsProtection';
import { QuestionNavigator } from '../components/QuestionNavigator';
import { ProgressIndicator } from '../components/ProgressIndicator';

export default function StudentEvaluationPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100"><Loader2 className="h-16 w-16 text-blue-500 animate-spin mb-4" /><p className="text-xl text-gray-300">Cargando parámetros de la evaluación...</p></div>}>
      <EvaluationContent />
    </Suspense>
  )
}

function EvaluationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const uniqueCode = searchParams.get('code');
  
  // Usar el hook para manejar datos del estudiante
  const { email, firstName, lastName, isDataLoaded } = useStudentData();

  // Estado para la evaluación y respuestas (declarado temprano para uso en callbacks)
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{ success: boolean; message: string; details?: string; grade?: number } | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [buttonCooldown, setButtonCooldown] = useState<number>(0);
  const [isHelpMode, setIsHelpMode] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [isEvaluationExpired, setIsEvaluationExpired] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(false);

  // Usar el hook para manejar la navegación de preguntas
  const {
    currentQuestionIndex,
    goToPreviousQuestion: navigateToPrevious,
    goToNextQuestion: navigateToNext,
    goToQuestion: navigateToQuestion
  } = useQuestionNavigation({
    totalQuestions: evaluation?.questions.length || 0,
    onQuestionChange: () => {
      setEvaluationResult(null);
    }
  });

  // Funciones de navegación que incluyen reseteo del resultado
  const goToPreviousQuestion = useCallback(() => {
    navigateToPrevious();
    setEvaluationResult(null);
  }, [navigateToPrevious]);

  const goToNextQuestion = useCallback(() => {
    navigateToNext();
    setEvaluationResult(null);
  }, [navigateToNext]);

  const goToQuestion = useCallback((index: number) => {
    navigateToQuestion(index);
    setEvaluationResult(null);
  }, [navigateToQuestion]);

  // Usar el hook para manejar el tema
  const { mounted, restoreTheme } = useThemeManagement();

  // Usar el hook para manejar la visibilidad de la página
  usePageVisibility();

  // Usar el hook para protección contra DevTools
  useDevToolsProtection();

  // Refs for state values needed in event handlers to avoid dependency loops
  const currentAnswerRef = useRef<Answer | null>(null);
  const timeOutsideEvalRef = useRef<number>(0);
  const saveAnswerRef = useRef<((submissionId: number, questionId: number, answerText: string, score?: number, timeOutsideEval?: number) => Promise<{ success: boolean; answer?: unknown; error?: string }>) | null>(null);

  // Usar el hook de detección de fraude (ahora solo para tiempo)
  const {
    timeOutsideEval,
    setHelpModalOpen,
  } = useFraudDetection({
    submissionId,
    onTimeOutsideUpdated: async (time) => {
      // Solo actualizar el tiempo en la base de datos cuando el usuario regrese
      // Usar función optimizada que solo actualiza el tiempo
      if (submissionId) {
        try {
          const { updateTimeOutsideEval } = await import('./actions');
          await updateTimeOutsideEval(submissionId, time);
        } catch (error) {
          console.error('Error al guardar tiempo fuera de la evaluación:', error);
        }
      }
    }
  });

  // Sistema de seguridad para detectar entrada no autorizada
  const { validateValueChange, setupKeyboardListeners, setupClipboardBlocking } = useInputSecurity({
    onSecurityViolation: () => {
      router.push('/student/security-violation');
    },
    suspiciousChangeThreshold: 50,
    timeWindowMs: 100
  });



  // Hook del temporizador de evaluación
  const { timeRemaining, isTimeExpired, progressPercentage } = useEvaluationTimer({
    endTime: evaluation?.endTime || new Date(),
    startTime: evaluation?.startTime,
    onTimeExpired: () => {
      // Enviar automáticamente cuando el tiempo expire
      if (handleSubmitEvaluationRef.current) {
        handleSubmitEvaluationRef.current();
      }
    }
  });

  // Actualizar el estado del modal de ayuda
  useEffect(() => {
    setHelpModalOpen(isHelpMode);
  }, [isHelpMode, setHelpModalOpen]);

  // Actualizar las refs cuando cambien los valores
  useEffect(() => {
    currentAnswerRef.current = answers[currentQuestionIndex];
    timeOutsideEvalRef.current = timeOutsideEval;
  }, [answers, currentQuestionIndex, timeOutsideEval]);

  // Cargar la función saveAnswer una sola vez
  useEffect(() => {
    const loadSaveAnswerFunction = async () => {
      try {
        const { saveAnswer } = await import('./actions');
        saveAnswerRef.current = saveAnswer;
      } catch (error) {
        console.error('Error al cargar la función saveAnswer:', error);
      }
    };

    loadSaveAnswerFunction();
  }, []);

  // Restaurar el tema seleccionado al cargar la página
  useEffect(() => {
    if (mounted) {
      restoreTheme();
    }
  }, [mounted, restoreTheme]);



  // Cargar datos de la evaluación
  useEffect(() => {
    // Esperar a que los datos del estudiante se carguen
    if (!isDataLoaded) {
      return;
    }

    if (!uniqueCode || !email || !firstName || !lastName) {
      console.error('Código de evaluación o datos del estudiante incompletos')
      router.push('/student')
      return
    }

    const loadEvaluationData = async () => {
      try {
        // Importar las acciones del servidor de forma dinámica para evitar errores de SSR
        const { getAttemptByUniqueCode, createSubmission } = await import('./actions')

        // Obtener los datos del intento por el código único y el email del estudiante
        const attemptResult = await getAttemptByUniqueCode(uniqueCode, email)

        if (!attemptResult.success) {
          // Verificar si la evaluación ya fue enviada
          if (attemptResult.alreadySubmitted) {
            // Redirigir silenciosamente a la página de éxito sin mostrar error
            router.push(`/student/success?alreadySubmitted=true&code=${uniqueCode}`)
            return
          }

          // Verificar si el error es debido a que la evaluación ha expirado
          if (attemptResult.error === 'La evaluación ya ha finalizado' ||
            attemptResult.error === 'La evaluación aún no ha comenzado') {
            setIsEvaluationExpired(true)
            setLoading(false)
            return
          }

          // Para otros errores, mostrar mensaje de error y establecer estado
          console.error(attemptResult.error)
          setErrorMessage(attemptResult.error || 'Error al cargar la evaluación')
          setLoading(false)
          return
        }

        // Verificar que attempt y evaluationData existan
        const { attempt, evaluation: evaluationData } = attemptResult

        if (!attempt || !evaluationData) {
          console.error('Datos de evaluación incompletos')
          router.push('/student')
          return
        }

        // Verificar si la evaluación está dentro del rango de tiempo permitido
        const now = toUTC(new Date())
        const startTime = toUTC(attempt.startTime)
        const endTime = toUTC(attempt.endTime)

        if (isBeforeUTC(now, startTime) || isAfterUTC(now, endTime)) {
          setIsEvaluationExpired(true)
          setLoading(false)
          return
        }

        // Crear una nueva presentación para este estudiante
        const submissionResult = await createSubmission(attempt.id, email, firstName, lastName)

        if (!submissionResult.success) {
          // Si el error es porque la evaluación ya fue enviada, redirigir a una página específica
          if (submissionResult.error && submissionResult.error.includes('ya fue enviada')) {
            router.push(`/student/success?alreadySubmitted=true&code=${uniqueCode}`)
          } else {
            console.error(submissionResult.error || 'Error al crear la presentación')
            setErrorMessage(submissionResult.error || 'Error al crear la presentación');
            setLoading(false);
          }
          return
        }

        // Verificar que submission exista
        if (!submissionResult.submission) {
          console.error('Error al crear la presentación')
          router.push('/student')
          return
        }

        // Guardar el ID de la presentación para usarlo más tarde
        const submissionId = submissionResult.submission.id
        setSubmissionId(submissionId)

        // Convertir los datos de la evaluación al formato esperado por el componente
        const formattedEvaluation: EvaluationData = {
          id: evaluationData.id,
          title: evaluationData.title,
          description: evaluationData.description || undefined,
          helpUrl: evaluationData.helpUrl || undefined,
          questions: evaluationData.questions,
          startTime: attempt.startTime,
          endTime: attempt.endTime
        }

        setEvaluation(formattedEvaluation)

        // Obtener respuestas guardadas previamente
        const { getAnswersBySubmissionId } = await import('./actions')
        const answersResult = await getAnswersBySubmissionId(submissionId)

        const questions = evaluationData.questions || []
        let initialAnswers = questions.map(question => {
          // Inicializamos todas las respuestas como cadenas vacías por defecto
          return {
            questionId: question.id,
            answer: '',
            evaluated: false,
            score: null as number | null
          }
        })

        // Si hay respuestas guardadas, las cargamos
        if (answersResult.success && answersResult.answers) {
          console.log('Respuestas obtenidas:', answersResult.answers)

          // Actualizar las respuestas con los datos guardados
          initialAnswers = initialAnswers.map(defaultAnswer => {
            // Buscar la respuesta guardada para esta pregunta
            const savedAnswer = answersResult.answers.find(a => a.questionId === defaultAnswer.questionId)

            if (savedAnswer) {
              console.log(`Respuesta encontrada para pregunta ${defaultAnswer.questionId}:`, savedAnswer)

              return {
                ...defaultAnswer,
                answer: savedAnswer.answer || '',
                score: savedAnswer.score,
                evaluated: savedAnswer.score !== null
              }
            }
            return defaultAnswer
          })
        } else {
          console.log('No se encontraron respuestas guardadas o hubo un error:', answersResult)
        }

        setAnswers(initialAnswers)
      } catch (error) {
        console.error('Error al cargar los datos de la evaluación:', error)
        console.error('Error al cargar la evaluación')
        router.push('/student')
      } finally {
        setLoading(false)
      }
    }

    loadEvaluationData()
  }, [uniqueCode, email, firstName, lastName, isDataLoaded, router])

  // Función para mostrar el diálogo de confirmación de envío
  const openSubmitDialog = useCallback(() => {
    if (!evaluation || !uniqueCode || !email || !firstName || !lastName || !submissionId) return

    setIsSubmitDialogOpen(true)
  }, [evaluation, uniqueCode, email, firstName, lastName, submissionId])

  // Enviar la evaluación completa
  const handleSubmitEvaluation = useCallback(async () => {
    if (!evaluation || !submissionId) return;

    try {
      const result = await submitEvaluation(submissionId);
      if (result.success) {
        // Redirigir a la página de reporte con los datos por query params
        router.push(`/student/report?name=${encodeURIComponent(firstName + ' ' + lastName)}&grade=${result.submission?.score ?? ''}&date=${encodeURIComponent(new Date().toLocaleString())}`)
        return;
      } else {
        setErrorMessage(result.error || 'Error al enviar la evaluación');
      }
    } catch (error) {
      console.error('Error al enviar la evaluación:', error);
      setErrorMessage('Error al enviar la evaluación');
    }
  }, [evaluation, submissionId, router, firstName, lastName]);

  // Referencia para la función de envío de evaluación para evitar dependencias circulares
  const handleSubmitEvaluationRef = useRef(handleSubmitEvaluation);

  // Actualizar la referencia cuando cambie la función
  useEffect(() => {
    handleSubmitEvaluationRef.current = handleSubmitEvaluation;
  }, [handleSubmitEvaluation]);



  // Manejar cambios en las respuestas con validación de seguridad
  const handleAnswerChange = (value: string) => {
    // Validar que el cambio proviene de entrada de teclado legítima
    if (!validateValueChange(value, 'textarea')) {
      return; // Bloquear el cambio si es sospechoso
    }

    const updatedAnswers = [...answers]
    updatedAnswers[currentQuestionIndex].answer = value
    updatedAnswers[currentQuestionIndex].evaluated = false
    updatedAnswers[currentQuestionIndex].score = null
    setAnswers(updatedAnswers)
    setEvaluationResult(null)

    // NO guardar automáticamente en la base de datos al cambiar respuestas
    // Solo se guardará cuando se evalúe o se envíe la evaluación
  }

  // Evaluar la respuesta actual con Gemini
  const evaluateCurrentAnswer = async () => {
    if (!evaluation || !submissionId) return

    const currentQuestion = evaluation.questions[currentQuestionIndex]
    const currentAnswer = answers[currentQuestionIndex]

    if (!currentAnswer.answer.trim()) {
      console.warn('Por favor, proporciona una respuesta antes de evaluar')
      return
    }

    // Verificar si el botón está en enfriamiento
    if (buttonCooldown > 0) {
      return
    }

    setEvaluating(true)

    try {
      if (currentQuestion.type && currentQuestion.type.toLowerCase() === 'code') {
        const language = JSON.parse(currentQuestion.answer || '{}').language || 'javascript'

        const result = await getAIFeedback(
          currentAnswer.answer,
          currentQuestion.text,
          language,
          evaluation.id
        )

        // Actualizar el estado de la respuesta
        const updatedAnswers = [...answers]
        updatedAnswers[currentQuestionIndex].evaluated = true
        updatedAnswers[currentQuestionIndex].score = result.grade
        setAnswers(updatedAnswers)

        // Guardar la respuesta evaluada en la base de datos
        let saveResult
        if (saveAnswerRef.current) {
          saveResult = await saveAnswerRef.current(
            submissionId,
            currentAnswer.questionId,
            currentAnswer.answer,
            result.grade !== undefined ? result.grade : undefined
          )
        } else {
          const { saveAnswer } = await import('./actions')
          saveResult = await saveAnswer(
            submissionId,
            currentAnswer.questionId,
            currentAnswer.answer,
            result.grade !== undefined ? result.grade : undefined
          )
        }

        if (!saveResult.success) {
          console.error('Error al guardar la respuesta evaluada:', saveResult.error)
        }

        // Mostrar resultado de la evaluación
        const newResult = {
          success: result.isCorrect,
          message: currentAnswer.evaluated ? 'Respuesta reevaluada' : (result.isCorrect ? '¡Respuesta correcta!' : 'La respuesta necesita mejoras'),
          details: result.feedback,
          grade: result.grade
        }
        setEvaluationResult(newResult)
        setIsResultModalOpen(true)
      } else {
        // Para preguntas de texto, evaluamos con IA usando la función específica para texto
        const result = await evaluateTextResponse(
          currentAnswer.answer,
          currentQuestion.text,
          evaluation.id
        )

        // Actualizar el estado de la respuesta
        const updatedAnswers = [...answers]
        updatedAnswers[currentQuestionIndex].evaluated = true
        updatedAnswers[currentQuestionIndex].score = result.grade
        setAnswers(updatedAnswers)

        // Guardar la respuesta evaluada en la base de datos
        let saveResult
        if (saveAnswerRef.current) {
          saveResult = await saveAnswerRef.current(
            submissionId,
            currentAnswer.questionId,
            currentAnswer.answer,
            result.grade !== undefined ? result.grade : undefined
          )
        } else {
          const { saveAnswer } = await import('./actions')
          saveResult = await saveAnswer(
            submissionId,
            currentAnswer.questionId,
            currentAnswer.answer,
            result.grade !== undefined ? result.grade : undefined
          )
        }

        if (!saveResult.success) {
          console.error('Error al guardar la respuesta evaluada:', saveResult.error)
        }

        const newResult = {
          success: result.isCorrect,
          message: currentAnswer.evaluated ? 'Respuesta reevaluada' : (result.isCorrect ? '¡Respuesta aceptable!' : 'La respuesta necesita mejoras'),
          details: result.feedback,
          grade: result.grade
        }
        setEvaluationResult(newResult)
        setIsResultModalOpen(true)
      }

      // Iniciar el temporizador de enfriamiento (30 segundos)
      setButtonCooldown(30)
      const cooldownTimer = setInterval(() => {
        setButtonCooldown(prev => {
          if (prev <= 1) {
            clearInterval(cooldownTimer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

    } catch (error) {
      console.error('Error al evaluar la respuesta:', error)
      console.error('Error al evaluar la respuesta. Por favor, intenta de nuevo.')
    } finally {
      setEvaluating(false)
    }
  }

  // Obtener el color del círculo según el estado de la respuesta
  const getQuestionStatusColor = (index: number) => {
    const answer = answers[index]

    if (!answer || !answer.answer.trim()) {
      return {
        bgColor: 'bg-muted border border-muted-foreground/30',
        tooltip: 'Sin responder',
        score: null
      }
    }

    if (!answer.evaluated) {
      return {
        bgColor: 'bg-amber-400 dark:bg-amber-600 border border-amber-500/50 dark:border-amber-700/50 animate-pulse',
        tooltip: 'Respondida pero no evaluada',
        score: null
      }
    }

    // Usar los mismos rangos y colores que en las alertas de respuestas
    if (answer.score !== null && answer.score !== undefined) {
      if (answer.score >= 4 && answer.score <= 5) {
        return {
          bgColor: 'bg-emerald-500 dark:bg-emerald-600 border border-emerald-600/50 dark:border-emerald-700/50',
          tooltip: 'Correcta',
          score: answer.score
        }
      } else if (answer.score >= 3 && answer.score < 4) {
        return {
          bgColor: 'bg-amber-500 dark:bg-amber-600 border border-amber-600/50 dark:border-amber-700/50',
          tooltip: 'Aceptable',
          score: answer.score
        }
      } else {
        return {
          bgColor: 'bg-red-500 dark:bg-red-600 border border-red-600/50 dark:border-red-700/50',
          tooltip: 'Necesita mejoras',
          score: answer.score
        }
      }
    }

    return {
      bgColor: 'bg-rose-500 dark:bg-rose-600 border border-rose-600/50 dark:border-rose-700/50',
      tooltip: 'Necesita mejoras',
      score: null
    }
  }

  // Renderizar pantalla de evaluación expirada
  const renderExpiredEvaluation = () => {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center text-red-600 dark:text-red-500">
              Evaluación no disponible
            </CardTitle>
            <CardDescription className="text-center">
              Esta evaluación ya no está disponible porque la fecha y hora límite ha expirado o aún no ha comenzado.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Clock className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-center mb-6">
              Por favor, contacta con tu profesor si necesitas acceso a esta evaluación.
            </p>
            <Button
              onClick={() => router.push('/student')}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Volver a ingresar código
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Función para cerrar el modal de ayuda
  const handleCloseHelpModal = useCallback((open: boolean) => {
    setIsHelpMode(open);
    setHelpModalOpen(open);
  }, [setHelpModalOpen]);

  // Efecto para cerrar el Sheet cuando el usuario cambia de pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isHelpMode) {
        handleCloseHelpModal(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isHelpMode, handleCloseHelpModal]);

  // Efecto para detectar cuando la página está oculta
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageHidden(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Efecto para detectar cuando la página está oculta y actualizar el título
  useEffect(() => {
    let titleInterval: NodeJS.Timeout;
    const originalTitle = evaluation?.title || 'Evaluación';

    const handleVisibilityChange = () => {
      setIsPageHidden(document.hidden);
      
      if (document.hidden) {
        // Cuando la página está oculta, alternar el título más rápidamente
        let showWarning = true;
        titleInterval = setInterval(() => {
          document.title = showWarning ? '🚨 ¡ALERTA! ¡Vuelve a la evaluación!' : '⚠️ ¡No abandones la evaluación!';
          showWarning = !showWarning;
        }, 800); // Reducido a 800ms para un parpadeo más rápido
      } else {
        // Cuando la página está visible, restaurar el título original
        clearInterval(titleInterval);
        document.title = originalTitle;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(titleInterval);
      document.title = originalTitle;
    };
  }, [evaluation?.title]);

  // Modal para evaluación en curso en otro dispositivo/navegador
  function EvaluationInProgressModal({ onBack }: { onBack: () => void }) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <Card className="w-full max-w-md shadow-2xl border-2 border-yellow-400 animate-fade-in">
          <CardHeader className="pb-2 flex flex-col items-center gap-2">
            <AlertCircle className="h-12 w-12 text-yellow-500 mb-2 animate-pulse" />
            <CardTitle className="text-2xl font-bold text-center text-yellow-700">Evaluación en curso</CardTitle>
            <CardDescription className="text-center mt-2 text-base text-muted-foreground">
              Ya tienes una evaluación en curso en otro dispositivo, navegador o ubicación.<br />
              <span className="font-medium">Debes continuar en el mismo lugar donde la iniciaste.</span><br />
              <span className="text-xs text-muted-foreground">Si crees que esto es un error, contacta a tu profesor.</span>
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col items-center gap-2 pb-6">
            <Button
              variant="secondary"
              className="w-full max-w-xs mt-2"
              onClick={onBack}
            >
              Volver a ingresar código
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Detección de DevTools: debe ir al inicio, junto con el resto de hooks
  useEffect(() => {
    const handleDevTools = (event: CustomEvent<{ isOpen: boolean }>) => {
      if (event.detail.isOpen) {
        window.close();
        window.location.href = 'about:blank';
      }
    };
    window.addEventListener('devtoolschange', handleDevTools as EventListener);
    if (devtools.isOpen) {
      window.close();
      window.location.href = 'about:blank';
    }
    return () => {
      window.removeEventListener('devtoolschange', handleDevTools as EventListener);
    };
  }, []);

  // Renderizado principal
  if (errorMessage && (errorMessage.includes('otro dispositivo') || errorMessage.toLowerCase().includes('deviceid'))) {
    return (
      <EvaluationInProgressModal onBack={() => router.push('/student')} />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Cargando evaluación...</p>
        </div>
      </div>
    )
  }

  if (isEvaluationExpired) {
    return renderExpiredEvaluation();
  }

  // Mostrar mensaje de error si hay un problema con la evaluación
  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center text-red-600 dark:text-red-500">
              Prueba no disponible
            </CardTitle>
            <CardDescription className="text-center">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-center mb-6">
              Por favor, verifica el código de evaluación o contacta con tu profesor si necesitas acceso a esta evaluación.
            </p>
            <Button
              onClick={() => router.push('/student')}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Volver a ingresar código
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!evaluation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl text-center text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">No se pudo cargar la evaluación. Por favor, verifica el código e intenta de nuevo.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push('/student')}>Volver</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const currentQuestion = evaluation.questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestionIndex]

  // Determinar el lenguaje de programación para preguntas de código
  let language = 'javascript'
  if (currentQuestion && currentQuestion.type && currentQuestion.type.toLowerCase() === 'code' && currentQuestion.answer) {
    try {
      const answerData = JSON.parse(currentQuestion.answer)
      language = answerData.language || 'javascript'
    } catch (e) {
      console.error('Error al parsear el campo answer:', e)
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-auto">
      {/* Barra superior con información y controles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 bg-card shadow-md flex-shrink-0 border-b gap-2">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Logo y nombre de la aplicación */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <PenTool className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">SEIA</span>
          </div>
          
          {/* Separador */}
          <div className="hidden sm:block h-6 border-l border-border/50"></div>
          
          {/* Información de la evaluación */}
          <div className="overflow-hidden flex-grow">
            <h1 className={`text-lg md:text-xl font-bold truncate transition-all duration-300 ${isPageHidden ? 'animate-pulse text-red-500 dark:text-red-400' : ''}`}>
              {isPageHidden ? '⚠️ ' : ''}{evaluation.title}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{firstName} {lastName}</p>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
          {/* Contenedor principal para elementos informativos con altura uniforme */}
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
            {/* Calificación calculada */}
            {answers.some(a => a.evaluated) && (
              <div className="flex items-center gap-1 h-9 bg-primary/10 px-3 rounded-md flex-grow md:flex-grow-0">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-semibold text-sm truncate">
                  Calificación: {(answers.reduce((sum, a) => sum + (a.score || 0), 0) / evaluation.questions.length).toFixed(1)}/5.0
                </span>
              </div>
            )}

            {/* Indicador de progreso */}
            <div className="flex items-center gap-1 h-9 bg-primary/10 px-3 rounded-md flex-grow md:flex-grow-0">
              <ProgressIndicator answers={answers} />
              <div className="flex flex-col w-full">
                <div className="w-full md:w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${Math.round((answers.filter(a => a.answer.trim().length > 0).length / answers.length) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Temporizador - Con la misma altura que los otros elementos */}
            <EvaluationTimer
              timeRemaining={timeRemaining}
              isTimeExpired={isTimeExpired}
              progressPercentage={progressPercentage}
              variant="default"
              showProgressBar={true}
            />

            {/* Alerta de tiempo fuera */}
            {timeOutsideEval > 0 && (
              <TimeTrackingAlert
                timeOutsideEval={timeOutsideEval}
              />
            )}
          </div>

          {/* Separador vertical en escritorio, horizontal en móvil */}
          <div className="hidden md:block h-9 border-l mx-1"></div>
          <div className="block md:hidden w-full border-t my-1"></div>

          {/* Contenedor para botones con altura uniforme */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* Botón de alternancia Ayuda/Evaluación */}
            {(evaluation?.helpUrl || currentQuestion.helpUrl) && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsHelpMode(!isHelpMode)}
                className={cn(
                  "h-9 px-3 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200",
                  isHelpMode 
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white" 
                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                )}
                title={isHelpMode ? "Volver a la evaluación" : "Ver recursos de ayuda"}
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">
                  {isHelpMode ? 'Evaluación' : 'Ayuda'}
                </span>
              </Button>
            )}
            
            {/* Botón de enviar evaluación */}
            <Button
              size="sm"
              onClick={openSubmitDialog}
              disabled={loading}
              className="gap-1 h-9 flex-grow md:flex-grow-0"
            >
              <Send className="h-4 w-4" />
              <span className="inline sm:hidden md:hidden lg:inline">{loading ? 'Enviando...' : 'Enviar'}</span>
              <span className="hidden sm:inline md:inline lg:hidden">{loading ? '...' : 'Enviar'}</span>
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span><ThemeToggle className="flex-shrink-0" /></span>
                </TooltipTrigger>
                <TooltipContent>Cambiar tema</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* El resultado de la evaluación ahora se muestra en un modal */}

      {/* Contenido principal - Diseño tipo landing page en móviles */}
      {isHelpMode ? (
        /* Modo Ayuda - Ocupa todo el espacio sin encabezado */
        <div className="flex-grow">
          {/* Contenido de ayuda sin Card wrapper */}
          <div className="w-full h-full">
              {evaluation?.helpUrl ? (
                <iframe
                  src={evaluation.helpUrl}
                  className="w-full h-full border-0"
                  title="Recursos de ayuda"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <HelpCircle className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    No hay recursos de ayuda configurados
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    El profesor no ha configurado recursos de ayuda para esta evaluación. 
                    Puedes continuar respondiendo las preguntas con tus conocimientos.
                  </p>
                </div>
              )}
           </div>
        </div>
      ) : (
        /* Modo Normal - Dos columnas: pregunta y respuesta */
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 p-3 sm:p-4 flex-grow" style={{ minHeight: 'auto' }}>
          {/* Columna izquierda: Visualizador de Markdown */}
          <Card className="flex flex-col overflow-hidden mb-2 lg:mb-0">
            <CardHeader className="py-0 px-2 sm:px-4 flex-shrink-0 mb-1 sm:mb-2">
              <CardTitle className="flex justify-between items-center text-sm sm:text-base">
                <span>Pregunta {currentQuestionIndex + 1}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${currentQuestion.type && currentQuestion.type.toLowerCase() === 'code' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                    {currentQuestion.type && currentQuestion.type.toLowerCase() === 'code' ? 'Código' : 'Texto'}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow p-3 sm:p-4 min-h-[300px] sm:min-h-[400px] h-full relative">
              <MarkdownViewer 
                content={currentQuestion.text} 
              />
            </CardContent>
          </Card>

          {/* Columna derecha: Editor de respuesta */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="py-0 px-2 sm:px-4 flex-shrink-0">
              <CardTitle className="flex flex-wrap sm:flex-nowrap justify-between items-center text-sm sm:text-base gap-1 sm:gap-0">
                <span>Tu Respuesta</span>
                <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                  {currentQuestion.type && currentQuestion.type.toLowerCase() === 'code' && (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 truncate max-w-[100px] sm:max-w-none">
                      {LANGUAGE_OPTIONS.find(opt => opt.value === language)?.label || language}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="default"
                    onClick={evaluateCurrentAnswer}
                    disabled={evaluating || !currentAnswer.answer.trim()}
                    className="h-10 sm:h-8 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium shadow-md hover:shadow-lg px-4"
                  >
                    {evaluating ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span className="hidden xs:inline">Evaluando...</span>
                        <span className="xs:hidden">...</span>
                      </span>
                    ) : buttonCooldown > 0 ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden xs:inline">{currentAnswer.evaluated ? "Reevaluar" : "Evaluar"} ({buttonCooldown}s)</span>
                        <span className="xs:hidden">({buttonCooldown}s)</span>
                      </span>
                    ) : currentAnswer.evaluated ? (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden xs:inline">Reevaluar con IA</span>
                        <span className="xs:hidden">Reevaluar</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="hidden xs:inline">Evaluar con IA</span>
                        <span className="xs:hidden">Evaluar</span>
                      </span>
                    )}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow p-3 sm:p-4 min-h-[300px] sm:min-h-[400px] h-full relative">
              {currentQuestion.type && currentQuestion.type.toLowerCase() === 'code' ? (
                <CodeEditor
                    value={currentAnswer.answer}
                  onChange={handleAnswerChange}
                  language={language}
                />
              ) : (
                <div className="absolute inset-0 m-3 sm:m-4">
                  <SecureTextarea
                    placeholder="Escribe tu respuesta aquí..."
                    value={currentAnswer.answer}
                    onChange={handleAnswerChange}
                    className="w-full h-full resize-none rounded-lg"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      fontSize: window.innerWidth < 640 ? '1.2rem' : '1.2rem',
                      padding: window.innerWidth < 640 ? '16px' : '12px',
                      lineHeight: '1.6',
                      overflowY: 'auto'
                    }}
                    spellCheck={true}
                    setupKeyboardListeners={setupKeyboardListeners}
                    setupClipboardBlocking={setupClipboardBlocking}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer con controles de paginación - Solo visible en modo normal */}
      {!isHelpMode && (
        <QuestionNavigator
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={evaluation.questions.length}
          onNavigateToQuestion={goToQuestion}
          onNavigateToPrevious={goToPreviousQuestion}
          onNavigateToNext={goToNextQuestion}
          getQuestionStatusColor={getQuestionStatusColor}
        />
      )}

      {/* Modal de confirmación para enviar evaluación */}
      <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío de evaluación</AlertDialogTitle>
            <AlertDialogDescription>
              {answers.filter(a => !a.answer.trim()).length > 0 ? (
                <>
                  <p className="mb-2">Tienes <span className="font-bold text-destructive">{answers.filter(a => !a.answer.trim()).length} pregunta(s) sin responder</span>.</p>
                  <p>Una vez enviada la evaluación, no podrás modificar tus respuestas. ¿Estás seguro de que deseas enviar la evaluación?</p>
                </>
              ) : (
                <p>Una vez enviada la evaluación, no podrás modificar tus respuestas. ¿Estás seguro de que deseas enviar la evaluación?</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitEvaluation} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar evaluación'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para mostrar el resultado de la evaluación */}
      {evaluationResult && (
        <AlertDialog open={isResultModalOpen} onOpenChange={setIsResultModalOpen}>
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl flex items-center gap-2">
                {evaluationResult.grade !== undefined ? (
                  evaluationResult.grade >= 4 ? (
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  ) : evaluationResult.grade >= 3 ? (
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )
                ) : (
                  evaluationResult.success ? (
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  )
                )}
                <span>
                  Resultado de la evaluación
                  {evaluationResult.grade !== undefined && (
                    <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${evaluationResult.grade >= 4 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                      evaluationResult.grade >= 3 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                        'bg-red-500/20 text-red-700 dark:text-red-300'
                      }`}>
                      {evaluationResult.grade.toFixed(1)}/5.0
                    </span>
                  )}
                </span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xl font-medium mt-2">
                {evaluationResult.message}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {evaluationResult.details && (
              <div className="my-4 max-h-[60vh] overflow-y-auto p-5 bg-muted/50 rounded-lg border">
                <p className="text-lg whitespace-pre-wrap leading-relaxed">{evaluationResult.details}</p>
              </div>
            )}

            <AlertDialogFooter className="gap-2">
              <AlertDialogAction onClick={() => setIsResultModalOpen(false)} className="w-full sm:w-auto">
                Cerrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
