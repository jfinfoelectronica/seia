import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { LANGUAGE_OPTIONS } from '@/lib/constants/languages';
import { generateQuestion, fixQuestionWording, summarizeAndOptimizeQuestion } from '@/lib/gemini-question-generation';
import { QuestionGenerationModal } from './QuestionGenerationModal';
import { TestQuestionPanel } from './TestQuestionPanel';
import { Loader2, Wand2, Sparkles } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const MDEditor = dynamic(() => import('@uiw/react-md-editor').then(mod => mod.default), { ssr: false });

interface QuestionDesignerProps {
  initialData?: {
    id?: number;
    text: string;
    type: 'TEXT' | 'CODE';
    language?: string;
  };
  onSave: (data: { text: string; type: 'TEXT' | 'CODE'; language?: string; }) => void;
  onCancel: () => void;
  onTextChange: (text: string) => void;
}

export function QuestionDesigner({ initialData, onSave, onCancel, onTextChange }: QuestionDesignerProps) {
  const [text, setText] = useState(initialData?.text || '');
  const [type, setType] = useState<'TEXT' | 'CODE'>(initialData?.type || 'TEXT');
  const [language, setLanguage] = useState(initialData?.language || LANGUAGE_OPTIONS[0].value);
  const [saved, setSaved] = useState(false);
  const { theme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isCorrigiendo, setIsCorrigiendo] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    if (saved) {
      // Scroll al top tras guardar
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [saved]);

  const handleSave = async () => {
    await onSave({ text, type, language: type === 'CODE' ? language : undefined });
    setSaved(true);
  };

  // En el diseñador, adapta la función handleGenerate y el uso del modal para pasar el tipo general y el subtipo
  const handleGenerate = async (prompt: string, questionType: string) => {
    setIsGenerating(true);
    try {
      const optimizedPrompt = optimizeQuestionText(prompt);
      // Determina el tipo general desde el diseñador
      const mainType = type === 'CODE' ? 'codigo' : 'texto';
      const generatedQuestion = await generateQuestion(optimizedPrompt, mainType, questionType, mainType === 'codigo' ? language : undefined);
      setText(generatedQuestion);
      onTextChange(generatedQuestion);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error al generar la pregunta:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  // Optimiza el texto eliminando espacios innecesarios y limita a 2000 caracteres
  function optimizeQuestionText(text: string): string {
    // Elimina espacios dobles, tabulaciones y saltos de línea redundantes
    let optimized = text.replace(/[ \t]+/g, ' '); // Espacios y tabs múltiples a uno
    optimized = optimized.replace(/\n{2,}/g, '\n'); // Saltos de línea múltiples a uno
    optimized = optimized.trim();
    // Limita a 2000 caracteres
    if (optimized.length > 2000) {
      optimized = optimized.slice(0, 2000);
    }
    return optimized;
  }

  if (isTesting) {
    return (
      <div className="w-full h-[100dvh] min-h-[600px] bg-card rounded-lg shadow-lg p-6 flex flex-col gap-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Diseñador de Pregunta</h2>
          <Button variant="outline" onClick={() => setIsTesting(false)}>
            Volver a diseño
          </Button>
        </div>
        <TestQuestionPanel text={text} type={type} language={type === 'CODE' ? language : undefined} />
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] min-h-[600px] bg-card rounded-lg shadow-lg p-6 flex flex-col gap-6 border">
      <div className="flex items-center justify-between mb-4 w-full">
        <h2 className="text-2xl font-bold whitespace-nowrap">Diseñador de Pregunta</h2>
        <div className="flex flex-wrap gap-2 items-center w-full">
          <label className="mb-0 font-medium whitespace-nowrap">Tipo de pregunta</label>
          <Select value={type} onValueChange={v => setType(v as 'TEXT' | 'CODE')}>
            <SelectTrigger className="w-auto min-w-[110px] border rounded p-2 bg-background text-foreground border-input">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TEXT">Texto</SelectItem>
              <SelectItem value="CODE">Código</SelectItem>
            </SelectContent>
          </Select>
          {/* Selector de lenguaje solo si es pregunta de código */}
          {type === 'CODE' && (
            <>
              <label className="mb-0 font-medium whitespace-nowrap">Lenguaje</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-auto min-w-[110px] border rounded p-2 bg-background text-foreground border-input">
                  <SelectValue placeholder="Lenguaje" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <Button onClick={() => setIsModalOpen(true)} variant="destructive" className="font-semibold px-4 py-2 border border-red-500 bg-red-500 text-white hover:bg-red-600 rounded shadow-sm">Generar con IA</Button>
          <Button variant="secondary" onClick={() => setIsTesting(true)} className="font-semibold flex items-center gap-2 px-4 py-2 border border-primary text-primary bg-white hover:bg-primary/10 focus:ring-2 focus:ring-primary/40 rounded shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6m9 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Probar pregunta
          </Button>
          <div className="flex gap-2 ml-auto justify-end flex-1">
            {!saved ? (
              <Button type="button" variant="outline" onClick={onCancel} className="font-semibold px-4 py-2 border border-gray-400 text-gray-700 bg-white hover:bg-gray-100 rounded shadow-sm">Cancelar</Button>
            ) : (
              <Button type="button" variant="default" onClick={onCancel} className="font-semibold px-4 py-2 border border-gray-400 text-gray-700 bg-white hover:bg-gray-100 rounded shadow-sm">Volver</Button>
            )}
            <Button type="button" onClick={handleSave} className="font-semibold px-4 py-2 bg-primary text-white hover:bg-primary/90 border border-primary rounded shadow-sm">Guardar</Button>
          </div>
        </div>
      </div>
      {/* Editor de enunciado */}
      <div className="flex-1 flex flex-col gap-2 min-h-0" data-color-mode={theme}>
        <label className="mb-1 font-medium flex items-center justify-between">
          Enunciado (Markdown)
          <span className={`text-xs ml-2 ${text.length > 2000 ? 'text-red-500 font-bold' : 'text-muted-foreground'} flex items-center gap-2`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{text.length}/2000</span>
              </TooltipTrigger>
              <TooltipContent>Cantidad de caracteres usados en la pregunta</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="ml-1 p-1 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={async () => {
                    setIsCorrigiendo(true);
                    try {
                      const fixed = await fixQuestionWording(text);
                      setText(fixed);
                    } catch {}
                    setIsCorrigiendo(false);
                  }}
                  disabled={isCorrigiendo || !text.trim() || isOptimizing}
                >
                  {isCorrigiendo ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <Wand2 className="w-4 h-4 text-primary" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>Corregir redacción</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="ml-1 p-1 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={async () => {
                    setIsOptimizing(true);
                    try {
                      const optimized = await summarizeAndOptimizeQuestion(text);
                      setText(optimized);
                    } catch {}
                    setIsOptimizing(false);
                  }}
                  disabled={isOptimizing || !text.trim() || isCorrigiendo}
                >
                  {isOptimizing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-primary" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>Optimizar pregunta</TooltipContent>
            </Tooltip>
          </span>
        </label>
        <div className="flex-1 min-h-0">
          <MDEditor 
            value={text}
            onChange={v => {
              const newText = v || '';
              if (newText.length <= 2000) {
                setText(newText);
              } else {
                setText(newText.slice(0, 2000));
              }
            }}
            height="100%" 
            style={{height: '100%'}}
            previewOptions={{
              className: 'prose prose-sm max-w-none p-4 dark:prose-invert'
            }}
            textareaProps={{
              style: { padding: '16px' },
              maxLength: 2000
            }}
          />
        </div>
      </div>

      <QuestionGenerationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        mainType={type === 'CODE' ? 'codigo' : 'texto'}
        language={type === 'CODE' ? language : undefined}
      />
    </div>
  );
}