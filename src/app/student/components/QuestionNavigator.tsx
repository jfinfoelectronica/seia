'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface QuestionNavigatorProps {
  currentQuestionIndex: number
  totalQuestions: number
  onNavigateToQuestion: (index: number) => void
  onNavigateToPrevious: () => void
  onNavigateToNext: () => void
  getQuestionStatusColor: (index: number) => {
    bgColor: string
    tooltip: string
    score: number | null
  }
}

export function QuestionNavigator({
  currentQuestionIndex,
  totalQuestions,
  onNavigateToQuestion,
  onNavigateToPrevious,
  onNavigateToNext,
  getQuestionStatusColor
}: QuestionNavigatorProps) {
  return (
    <div className="flex justify-center items-center p-1.5 sm:p-2 bg-gradient-to-r from-background/95 via-card/80 to-background/95 shadow-lg border-t border-border/60 flex-shrink-0 sticky bottom-0 z-10 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 sm:gap-3 w-full max-w-4xl">
        {/* Botón Anterior */}
        <Button
          size="sm"
          variant="outline"
          onClick={onNavigateToPrevious}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-1 h-7 px-2 sm:h-8 sm:px-3 flex-shrink-0 font-medium border-border/60 hover:border-primary/50 transition-all duration-300 bg-gradient-to-r from-card/80 to-muted/40 hover:from-primary/5 hover:to-primary/10 shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
        >
          <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline text-xs">Anterior</span>
          <span className="sm:hidden text-xs">Ant.</span>
        </Button>

        {/* Paginación con tooltips - Centrada y mejorada */}
        <div className="flex items-center justify-center flex-1 px-1">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1.5 px-2 bg-gradient-to-r from-card/60 via-muted/50 to-card/60 rounded-lg border border-border/40 shadow-inner backdrop-blur-sm">
            {Array.from({ length: totalQuestions }, (_, index) => {
              const statusStyle = getQuestionStatusColor(index);
              const isActive = currentQuestionIndex === index;
              
              return (
                <TooltipProvider key={index}>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onNavigateToQuestion(index)}
                        className={`
                          relative flex-shrink-0 flex items-center justify-center 
                          h-7 w-7 sm:h-8 sm:w-8 rounded-full 
                          ${statusStyle.bgColor} 
                          ${isActive ? 'ring-2 ring-primary/70 ring-offset-1 ring-offset-background scale-105 shadow-lg' : 'hover:scale-105 shadow-sm'} 
                          transform transition-all duration-300 ease-out
                          focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-1 focus:ring-offset-background
                          border border-white/60 dark:border-gray-700/60
                          hover:shadow-lg hover:border-primary/40 hover:brightness-110
                          group overflow-hidden
                        `}
                        aria-label={`Pregunta ${index + 1}: ${statusStyle.tooltip}`}
                      >
                        {/* Número de pregunta */}
                        <span className={`
                          text-xs font-bold z-10 relative
                          ${isActive ? 'text-primary-foreground' : 'text-foreground'}
                          transition-all duration-300 group-hover:scale-110
                        `}>
                          {index + 1}
                        </span>
                        
                        {/* Indicador de pregunta activa */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-full bg-primary/15 animate-pulse" />
                        )}
                        
                        {/* Efecto hover con gradiente sutil */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Brillo sutil en hover */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top" 
                      className="text-sm font-medium bg-popover/95 border border-border/60 shadow-xl backdrop-blur-md text-popover-foreground max-w-xs"
                      sideOffset={6}
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-foreground">Pregunta {index + 1}</p>
                        <p className="text-xs text-muted-foreground">{statusStyle.tooltip}</p>
                        {statusStyle.score !== null && (
                          <p className="font-semibold text-xs text-primary">Calificación: {statusStyle.score.toFixed(1)}/5.0</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* Botón Siguiente */}
        <Button
          size="sm"
          variant="outline"
          onClick={onNavigateToNext}
          disabled={currentQuestionIndex === totalQuestions - 1}
          className="flex items-center gap-1 h-7 px-2 sm:h-8 sm:px-3 flex-shrink-0 font-medium border-border/60 hover:border-primary/50 transition-all duration-300 bg-gradient-to-r from-card/80 to-muted/40 hover:from-primary/5 hover:to-primary/10 shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="hidden sm:inline text-xs">Siguiente</span>
          <span className="sm:hidden text-xs">Sig.</span>
          <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </Button>
      </div>
    </div>
  )
}