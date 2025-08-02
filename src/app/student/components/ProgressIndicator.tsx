import React from 'react';
import { BarChart } from 'lucide-react';

interface Answer {
  questionId: number;
  answer: string;
  score?: number | null;
  evaluated: boolean;
}

interface ProgressIndicatorProps {
  answers: Answer[];
  className?: string;
}

export function ProgressIndicator({ answers, className = '' }: ProgressIndicatorProps) {
  // Calcular el progreso de la evaluación
  const calculateProgress = () => {
    if (!answers.length) return 0;
    const answeredQuestions = answers.filter(a => a.answer.trim().length > 0).length;
    return Math.round((answeredQuestions / answers.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <BarChart className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground">
        {progress}%
      </span>
    </div>
  );
}