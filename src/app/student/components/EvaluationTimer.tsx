import React from 'react'
import { Clock } from 'lucide-react'
import { formatTimeRemaining } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

interface EvaluationTimerProps {
  timeRemaining: number
  isTimeExpired: boolean
  progressPercentage?: number
  className?: string
  showProgressBar?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

export function EvaluationTimer({
  timeRemaining,
  isTimeExpired,
  progressPercentage = 0,
  className,
  showProgressBar = true,
  variant = 'default'
}: EvaluationTimerProps) {
  const formattedTime = formatTimeRemaining(timeRemaining)
  
  // Determinar si el tiempo está en estado crítico (menos de 5 minutos)
  const isCritical = timeRemaining <= 5 * 60 * 1000 && timeRemaining > 0
  
  // Determinar si el tiempo está en estado de advertencia (menos de 15 minutos)
  const isWarning = timeRemaining <= 15 * 60 * 1000 && timeRemaining > 5 * 60 * 1000

  const getTimerStyles = () => {
    if (isTimeExpired) {
      return {
        container: 'bg-red-100 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
        icon: 'text-red-600 dark:text-red-500',
        progress: 'bg-red-500'
      }
    } else if (isCritical) {
      return {
        container: 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800/50',
        text: 'text-red-600 dark:text-red-400',
        icon: 'text-red-500 dark:text-red-400',
        progress: 'bg-red-400'
      }
    } else if (isWarning) {
      return {
        container: 'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/50',
        text: 'text-yellow-700 dark:text-yellow-400',
        icon: 'text-yellow-600 dark:text-yellow-500',
        progress: 'bg-yellow-500'
      }
    } else {
      return {
        container: 'bg-primary/10 border-primary/20',
        text: 'text-primary',
        icon: 'text-primary',
        progress: 'bg-primary'
      }
    }
  }

  const styles = getTimerStyles()

  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-300',
        styles.container,
        className
      )}>
        <Clock className={cn('h-4 w-4 flex-shrink-0', styles.icon)} />
        <span className={cn('text-sm font-semibold tracking-tight', styles.text)}>
          {formattedTime}
        </span>
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn(
        'flex flex-col gap-2 p-4 rounded-lg border transition-all duration-300',
        styles.container,
        className
      )}>
        <div className="flex items-center gap-2">
          <Clock className={cn('h-5 w-5 flex-shrink-0', styles.icon)} />
          <span className={cn('text-lg font-bold tracking-tight', styles.text)}>
            Tiempo restante
          </span>
        </div>
        <div className={cn('text-2xl font-bold tracking-tight', styles.text)}>
          {formattedTime}
        </div>
        {showProgressBar && (
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
            <div
              className={cn('h-full rounded-full transition-all duration-300 ease-in-out', styles.progress)}
              style={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
            />
          </div>
        )}
        {isTimeExpired && (
          <p className={cn('text-sm font-medium', styles.text)}>
            La evaluación ha finalizado
          </p>
        )}
      </div>
    )
  }

  // Variant 'default'
  return (
    <div className={cn(
      'flex items-center h-9 gap-1 px-3 rounded-md border transition-all duration-300',
      styles.container,
      className
    )}>
      <Clock className={cn('h-4 w-4 flex-shrink-0', styles.icon)} />
      <div className="flex flex-col w-full">
        <div className="flex justify-between items-center mb-1">
          <span className={cn('text-xs font-medium tracking-tight', styles.text)}>
            Tiempo
          </span>
          <span className={cn('text-xs font-semibold tracking-tight', styles.text)}>
            {formattedTime}
          </span>
        </div>
        {showProgressBar && (
          <div className="w-full md:w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
            <div
              className={cn('h-full rounded-full transition-all duration-300 ease-in-out', styles.progress)}
              style={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}