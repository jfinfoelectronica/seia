import { useState, useEffect, useRef } from 'react'
import { toUTC } from '@/lib/date-utils'

interface UseEvaluationTimerProps {
  endTime: Date | string
  startTime?: Date | string
  onTimeExpired?: () => void
}

interface UseEvaluationTimerReturn {
  timeRemaining: number
  isTimeExpired: boolean
  progressPercentage: number
}

export function useEvaluationTimer({ 
  endTime, 
  startTime,
  onTimeExpired 
}: UseEvaluationTimerProps): UseEvaluationTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false)
  const onTimeExpiredRef = useRef(onTimeExpired)

  // Actualizar la referencia cuando cambie la función
  useEffect(() => {
    onTimeExpiredRef.current = onTimeExpired
  }, [onTimeExpired])

  // Temporizador para el tiempo restante
  useEffect(() => {
    if (!endTime) return

    const endTimeUTC = toUTC(endTime).getTime()
    
    const updateTimer = () => {
      const now = toUTC(new Date()).getTime()
      const diff = Math.max(0, endTimeUTC - now)
      setTimeRemaining(diff)

      if (diff <= 0 && !isTimeExpired) {
        setIsTimeExpired(true)
        // Llamar la función de callback cuando el tiempo expire
        if (onTimeExpiredRef.current) {
          onTimeExpiredRef.current()
        }
      }
    }

    updateTimer()
    const timerId = setInterval(updateTimer, 1000)

    return () => clearInterval(timerId)
  }, [endTime, isTimeExpired])

  // Calcular el porcentaje de progreso basado en el tiempo transcurrido
  const progressPercentage = (() => {
    if (!endTime || timeRemaining <= 0) return 0
    
    // Si tenemos startTime, usar el tiempo total de la evaluación
    if (startTime) {
      const totalTime = toUTC(endTime).getTime() - toUTC(startTime).getTime()
      return totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0
    }
    
    // Si no tenemos startTime, asumir que el tiempo total es desde ahora hasta endTime
    const totalTime = toUTC(endTime).getTime() - toUTC(new Date()).getTime() + timeRemaining
    return totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0
  })()

  return {
    timeRemaining,
    isTimeExpired,
    progressPercentage
  }
}