"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getEvaluaciones } from '../evaluations/actions';
import { RotateCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Evaluation {
  id: number;
  title: string;
}

interface ScheduleFormProps {
  onSave: (data: { evaluationId: number; uniqueCode: string; startTime: string; endTime: string; }) => void;
  onCancel: () => void;
  initialData?: {
    evaluationId: number;
    uniqueCode: string;
    startTime: string;
    endTime: string;
  };
}

function generateCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function ScheduleForm({ onSave, onCancel, initialData }: ScheduleFormProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evaluationId, setEvaluationId] = useState(initialData?.evaluationId ? String(initialData.evaluationId) : '');
  const [uniqueCode, setUniqueCode] = useState(initialData?.uniqueCode || (!initialData ? generateCode() : ''));
  const [startTime, setStartTime] = useState(initialData?.startTime || '');
  const [endTime, setEndTime] = useState(initialData?.endTime || '');

  // Cargar evaluaciones al montar
  useEffect(() => {
    getEvaluaciones().then(setEvaluations);
  }, []);

  const isEdit = Boolean(initialData);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSave({
          evaluationId: Number(evaluationId),
          uniqueCode,
          startTime,
          endTime,
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block mb-1 font-medium">Evaluación</label>
        <Select value={evaluationId} onValueChange={v => setEvaluationId(String(v))} required>
          <SelectTrigger className="w-full border rounded p-2">
            <SelectValue placeholder="Selecciona una evaluación" />
          </SelectTrigger>
          <SelectContent>
            {evaluations.map(ev => (
              <SelectItem key={ev.id} value={String(ev.id)}>{ev.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block mb-1 font-medium">Código único</label>
        <div className="flex gap-2 items-center">
          <Input value={uniqueCode} readOnly={!isEdit} onChange={e => setUniqueCode(e.target.value)} required maxLength={8} />
          {!isEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setUniqueCode(generateCode())}>
                    <RotateCw className="h-4 w-4" />
                    <span className="sr-only">Generar nuevo código</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generar nuevo código</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <div>
        <label className="block mb-1 font-medium">Fecha y hora de inicio</label>
        <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required />
      </div>
      <div>
        <label className="block mb-1 font-medium">Fecha y hora de fin</label>
        <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Guardar</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
} 