import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock } from 'lucide-react';

interface TimeTrackingAlertProps {
  timeOutsideEval: number;
}

export function TimeTrackingAlert({ timeOutsideEval }: TimeTrackingAlertProps) {
  if (timeOutsideEval === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center h-auto py-1.5 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 rounded-lg flex-grow md:flex-grow-0 shadow-lg border border-blue-400/30 cursor-help">
            <div className="bg-white/20 p-1 rounded-full">
              <Clock className="h-3 w-3 text-white" />
            </div>
            <div className="flex flex-row gap-3 items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-help">
                    <div className="bg-white/20 h-5 w-5 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{Math.floor(timeOutsideEval / 60)}</span>
                    </div>
                    <span className="text-white text-xs font-medium">min</span>
                    <div className="bg-white/20 h-5 w-5 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{timeOutsideEval % 60}</span>
                    </div>
                    <span className="text-white text-xs font-medium">seg</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[250px] bg-slate-900 text-white">
                  <p>Tiempo total fuera de la evaluación</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px] bg-slate-900 text-white">
          <div className="space-y-2">
            <p className="font-bold">Seguimiento de Tiempo - SEIAC</p>
            <p className="text-xs">El sistema registra el tiempo que pasas fuera de la ventana de evaluación para fines estadísticos y de seguimiento académico.</p>
            <p className="text-xs text-blue-300 mt-2">Puedes cambiar de pestaña o ventana libremente. Solo se registra el tiempo para análisis posterior.</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Mantener compatibilidad con el nombre anterior
export function FraudAlert({ timeOutsideEval }: { timeOutsideEval: number }) {
  return <TimeTrackingAlert timeOutsideEval={timeOutsideEval} />;
}