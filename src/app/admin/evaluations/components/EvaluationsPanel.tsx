"use client";
import { useState, useTransition } from "react";
import { EvaluationsTable } from "./EvaluationsTable";
import { Button } from "@/components/ui/button";
import { QuestionsPanel } from "./QuestionsPanel";
import { EvaluationTableRow } from '../types';
import { getEvaluacionCompleta } from '../actions';

interface EvaluationsPanelProps {
  evaluations: EvaluationTableRow[];
  teachers: Array<{
    id: number | string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    name?: string;
  }>;
}

export function EvaluationsPanel({ evaluations: initialEvaluations, teachers }: EvaluationsPanelProps) {
  const [questionsEvalId, setQuestionsEvalId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Exportar evaluación y preguntas como JSON (igual que el panel del profesor)
  const handleExport = (id: number) => {
    startTransition(async () => {
      try {
        const evaluacionCompleta = await getEvaluacionCompleta(id);
        if (!evaluacionCompleta) {
          alert('No se pudo obtener la evaluación');
          return;
        }
        const exportData = {
          title: evaluacionCompleta.title,
          description: evaluacionCompleta.description,
          helpUrl: evaluacionCompleta.helpUrl,
          questions: (evaluacionCompleta.questions || []).map((q: { text: string; type: string; language?: string | null }) => ({
            text: q.text,
            type: q.type,
            language: q.language ?? undefined,
          })),
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${evaluacionCompleta.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_evaluacion.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error al exportar:', error);
        alert('Error al exportar la evaluación');
      }
    });
  };

  return (
    <div>
      {questionsEvalId ? (
        <div>
          <Button className="mb-4" variant="outline" onClick={() => setQuestionsEvalId(null)}>
            ← Volver a evaluaciones
          </Button>
          <QuestionsPanel evaluationId={questionsEvalId} />
        </div>
      ) : (
        <EvaluationsTable
          evaluations={initialEvaluations}
          teachers={teachers}
          onQuestions={setQuestionsEvalId}
          onExport={handleExport}
        />
      )}
    </div>
  );
} 