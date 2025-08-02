"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import MDEditor from '@uiw/react-md-editor';
import { useTheme } from 'next-themes';
import { type DifficultQuestionStat } from './actions';

interface DifficultQuestionsTableProps {
  questions: DifficultQuestionStat[];
}

export function DifficultQuestionsTable({ questions }: DifficultQuestionsTableProps) {
  const { theme } = useTheme();

  return (
    <div className="mt-4 rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evaluación</TableHead>
            <TableHead className="text-right">Puntaje Promedio</TableHead>
            <TableHead className="text-center">Vista Previa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.length > 0 ? (
            questions.map((q) => (
              <TableRow key={q.questionId}>
                <TableCell>
                  <p className="font-medium">{q.evaluationTitle}</p>
                </TableCell>
                <TableCell className="text-right font-mono">{q.averageScore.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Ver</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl" data-color-mode={theme}>
                      <DialogHeader>
                        <DialogTitle>Vista Previa de la Pregunta</DialogTitle>
                      </DialogHeader>
                      <div className="prose prose-sm max-w-none dark:prose-invert mt-4">
                        <MDEditor.Markdown source={q.questionText} />
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No hay datos suficientes para analizar preguntas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 