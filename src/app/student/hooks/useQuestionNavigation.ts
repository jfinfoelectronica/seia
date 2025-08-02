import { useState, useCallback } from 'react';

interface UseQuestionNavigationProps {
  totalQuestions: number;
  onQuestionChange?: (index: number) => void;
}

export function useQuestionNavigation({ 
  totalQuestions, 
  onQuestionChange 
}: UseQuestionNavigationProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Navegar a la pregunta anterior
  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      onQuestionChange?.(prevIndex);
    }
  }, [currentQuestionIndex, onQuestionChange]);

  // Navegar a la pregunta siguiente
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      onQuestionChange?.(nextIndex);
    }
  }, [currentQuestionIndex, totalQuestions, onQuestionChange]);

  // Navegar a una pregunta específica
  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index);
      onQuestionChange?.(index);
    }
  }, [totalQuestions, onQuestionChange]);

  // Verificar si se puede navegar
  const canGoToPrevious = currentQuestionIndex > 0;
  const canGoToNext = currentQuestionIndex < totalQuestions - 1;

  return {
    currentQuestionIndex,
    setCurrentQuestionIndex,
    goToPreviousQuestion,
    goToNextQuestion,
    goToQuestion,
    canGoToPrevious,
    canGoToNext
  };
}