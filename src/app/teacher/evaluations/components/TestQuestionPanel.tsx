import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { EvaluationResultModal } from '@/components/ui/EvaluationResultModal';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { evaluateStudentCode } from '@/lib/gemini-code-evaluation';
import { evaluateTextResponse } from '@/lib/gemini-text-evaluation';
import { generateAnswer } from '@/lib/gemini-answer-generation';

const MarkdownViewer = dynamic(() => import('./markdown-viewer').then(mod => mod.MarkdownViewer), { ssr: false });
const CodeEditor = dynamic(() => import('./code-editor').then(mod => mod.CodeEditor), { ssr: false });

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  typescript: 'TypeScript',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  ruby: 'Ruby',
  php: 'PHP',
  rust: 'Rust',
  swift: 'Swift',
  kotlin: 'Kotlin',
  // Agrega más si es necesario
};

interface TestQuestionPanelProps {
  text: string;
  type: 'TEXT' | 'CODE';
  language?: string;
}

export function TestQuestionPanel({ text, type, language }: TestQuestionPanelProps) {
  const [answer, setAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<null | { isCorrect: boolean; grade?: number; feedback: string }>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      let evalResult;
      if (type === 'CODE') {
        evalResult = await evaluateStudentCode(text, answer, language || 'javascript');
      } else {
        evalResult = await evaluateTextResponse(answer, text, 0);
      }
      setResult(evalResult);
      setModalOpen(true);
    } catch {
      setResult({ isCorrect: false, feedback: 'Ocurrió un error al evaluar la respuesta.' });
      setModalOpen(true);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGenerateAnswer = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateAnswer(text, type === 'CODE' ? language : undefined);
      setAnswer(generated);
    } catch {
      setAnswer('Error al generar la respuesta.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 p-3 sm:p-4 flex-grow w-full h-full min-h-0 min-w-0 bg-transparent">
      {/* Columna izquierda: Visualizador de Markdown */}
      <Card className="flex flex-col overflow-hidden mb-2 lg:mb-0 h-full">
        <CardHeader className="py-0 px-2 sm:px-4 flex-shrink-0 mb-1 sm:mb-2">
          <CardTitle className="flex justify-between items-center text-sm sm:text-base">
            <span>Enunciado</span>
            <span className={`px-2 py-1 text-xs rounded-full ${type === 'CODE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
              {type === 'CODE' ? 'Código' : 'Texto'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow p-3 sm:p-4 min-h-[300px] sm:min-h-[400px] h-full relative">
          <MarkdownViewer content={text} />
        </CardContent>
      </Card>
      {/* Columna derecha: Editor de respuesta */}
      <Card className="flex flex-col overflow-hidden h-full">
        <CardHeader className="py-0 px-2 sm:px-4 flex-shrink-0">
          <CardTitle className="flex flex-wrap sm:flex-nowrap justify-between items-center text-sm sm:text-base gap-1 sm:gap-0 w-full">
            <span>Tu Respuesta</span>
            <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
              {type === 'CODE' && (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 truncate max-w-[100px] sm:max-w-none">
                  {LANGUAGE_LABELS[language || 'javascript'] || language || 'Código'}
                </span>
              )}
              <Button
                size="sm"
                variant="default"
                onClick={handleEvaluate}
                disabled={isEvaluating || !answer.trim()}
                className="h-10 sm:h-8 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium shadow-md hover:shadow-lg px-4"
              >
                {isEvaluating ? 'Evaluando...' : 'Evaluar con Gemini'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleGenerateAnswer}
                disabled={isGenerating}
                className="h-10 sm:h-8 text-sm sm:text-base bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-medium shadow px-4 mr-2"
              >
                {isGenerating ? 'Generando...' : 'Generar respuesta IA'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow p-3 sm:p-4 min-h-[300px] sm:min-h-[400px] h-full relative">
          {type === 'CODE' ? (
            <CodeEditor value={answer} onChange={setAnswer} language={language || 'javascript'} height="100%" />
          ) : (
            <div className="absolute inset-0 m-3 sm:m-4">
              <Textarea
                placeholder="Escribe tu respuesta aquí..."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                className="w-full h-full resize-none rounded-lg"
                style={{ position: 'absolute', inset: 0, fontSize: '1.2rem', padding: '12px', lineHeight: '1.6', overflowY: 'auto' }}
                spellCheck={true}
              />
            </div>
          )}
        </CardContent>
      </Card>
      <EvaluationResultModal isOpen={modalOpen} onClose={() => setModalOpen(false)} result={result} />
    </div>
  );
}