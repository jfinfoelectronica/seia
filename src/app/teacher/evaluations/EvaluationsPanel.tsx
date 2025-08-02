"use client";
import { useState, useTransition } from 'react';
import { EvaluationsTable, Evaluation } from './components/EvaluationsTable';
import { EvaluationForm } from './components/EvaluationForm';
import { Button } from '@/components/ui/button';
import { createEvaluacion, updateEvaluacion, deleteEvaluacion, getEvaluacionCompleta } from './actions';
import { QuestionsPanel } from './components/QuestionsPanel';
import { ImportEvaluationModal } from './components/ImportEvaluationModal';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusCircle } from 'lucide-react';

interface EvaluationsPanelProps {
  initialEvaluations: Evaluation[];
  evaluationLimit: number;
  evaluationCount: number;
}

function normalizeEvaluation(ev: unknown): Evaluation {
  const e = ev as Partial<Evaluation>;
  function toISOStringSafe(date: unknown): string {
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return '';
  }
  return {
    id: e.id!,
    title: e.title!,
    description: e.description ?? '',
    helpUrl: e.helpUrl ?? '',
    createdAt: toISOStringSafe(e.createdAt),
    updatedAt: toISOStringSafe(e.updatedAt),
  };
}

export function EvaluationsPanel({ 
  initialEvaluations,
  evaluationLimit,
  evaluationCount
}: EvaluationsPanelProps) {
  const [evaluations, setEvaluations] = useState(initialEvaluations.map(normalizeEvaluation));
  const [currentEvaluationCount, setCurrentEvaluationCount] = useState(evaluationCount);
  const [editing, setEditing] = useState<Evaluation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();
  const [questionsEvalId, setQuestionsEvalId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [error, setError] = useState('');
  
  const hasReachedLimit = currentEvaluationCount >= evaluationLimit;

  const handleCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (ev: Evaluation) => {
    setEditing(ev);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId !== null) {
      startTransition(async () => {
        await deleteEvaluacion(deleteId);
        setEvaluations(evaluations.filter(ev => ev.id !== deleteId));
        setCurrentEvaluationCount(count => count - 1);
        setDeleteId(null);
      });
    }
  };

  const cancelDelete = () => setDeleteId(null);

  const handleSubmit = (data: { title: string; description?: string; helpUrl?: string }) => {
    startTransition(async () => {
      try {
        setError(''); // Limpiar errores previos
      if (editing) {
        const updated = normalizeEvaluation(await updateEvaluacion(editing.id, data));
        setEvaluations(evaluations.map(ev => (ev.id === editing.id ? updated : ev)));
      } else {
        const created = normalizeEvaluation(await createEvaluacion(data));
        setEvaluations([created, ...evaluations]);
          setCurrentEvaluationCount(count => count + 1);
      }
      setShowForm(false);
      setEditing(null);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("Ocurrió un error inesperado.");
        }
      }
    });
  };

  const handleExport = async (evaluationId: number) => {
    try {
      const evaluacionCompleta = await getEvaluacionCompleta(evaluationId);
      if (!evaluacionCompleta) {
        alert('No se pudo obtener la evaluación');
        return;
      }

      // Preparar datos para exportar (sin IDs internos)
      const exportData = {
        title: evaluacionCompleta.title,
        description: evaluacionCompleta.description,
        helpUrl: evaluacionCompleta.helpUrl,
        questions: evaluacionCompleta.questions.map(q => ({
          text: q.text,
          type: q.type,
          language: q.language,
        })),
      };

      // Crear y descargar archivo JSON
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
  };

  const handleImportSuccess = () => {
    // Recargar las evaluaciones después de importar
    window.location.reload();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Evaluaciones</h1>
          <p className="text-muted-foreground">
            Aquí puedes crear, ver y gestionar tus evaluaciones.
          </p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button onClick={() => setShowImportModal(true)} variant="outline" disabled={hasReachedLimit}>
                    <Upload className="mr-2 h-4 w-4" /> Importar
                  </Button>
                </div>
              </TooltipTrigger>
              {hasReachedLimit && (
                <TooltipContent>
                  <p>Has alcanzado tu límite de evaluaciones.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
    <div>
                  <Button onClick={handleCreate} disabled={hasReachedLimit}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Crear Evaluación
                  </Button>
                </div>
              </TooltipTrigger>
              {hasReachedLimit && (
                <TooltipContent>
                  <p>Has alcanzado tu límite de evaluaciones.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="mb-4 text-sm text-muted-foreground">
        Has creado {currentEvaluationCount} de {evaluationLimit} evaluaciones.
      </div>
      
      {/* Modal de confirmación para eliminar evaluación */}
      <AlertDialog open={deleteId !== null} onOpenChange={cancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evaluación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar esta evaluación y todas sus preguntas asociadas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancelar</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de importación */}
      <ImportEvaluationModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportSuccess}
      />

      {questionsEvalId ? (
        <div>
          <Button className="mb-4" variant="outline" onClick={() => setQuestionsEvalId(null)}>
            ← Volver a evaluaciones
          </Button>
          <QuestionsPanel evaluationId={questionsEvalId} />
        </div>
      ) : showForm ? (
        <div>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        <EvaluationForm
          evaluation={editing || undefined}
          onSave={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
              setError(''); // Limpiar error al cancelar
          }}
        />
        </div>
      ) : (
        <>
          <EvaluationsTable
            evaluations={evaluations}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onQuestions={setQuestionsEvalId}
            onExport={handleExport}
          />
        </>
      )}
    </div>
  );
} 