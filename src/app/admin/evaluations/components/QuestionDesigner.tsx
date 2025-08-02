import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LANGUAGE_OPTIONS } from '@/lib/constants/languages';
import { Wand2 } from 'lucide-react';
import { generateQuestion } from '@/lib/gemini-question-generation';
import { QuestionGenerationModal } from './QuestionGenerationModal';

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

  useEffect(() => {
    if (saved) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [saved]);

  const handleSave = async () => {
    await onSave({ text, type, language: type === 'CODE' ? language : undefined });
    setSaved(true);
  };

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    try {
      // Map internal type to expected values for generateQuestion
      const mappedType = type === 'CODE' ? 'codigo' : 'texto';
      const generatedQuestion = await generateQuestion(prompt, mappedType, language);
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

  return (
    <div className="w-full h-[100dvh] min-h-[600px] bg-card rounded-lg shadow-lg p-6 flex flex-col gap-6 border">
      <h2 className="text-2xl font-bold mb-1">Diseñador de Pregunta</h2>
      <div className="flex flex-wrap gap-4 items-end justify-between mb-2 w-full">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block mb-1 font-medium">Tipo de pregunta</label>
            <Select value={type} onValueChange={(value) => setType(value as 'TEXT' | 'CODE')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TEXT">Texto</SelectItem>
                <SelectItem value="CODE">Código</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === 'CODE' && (
            <div className="flex-1 min-w-[150px]">
              <label className="block mb-1 font-medium">Lenguaje</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar lenguaje" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {!saved && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsModalOpen(true)} variant="destructive">
              <Wand2 className="h-4 w-4 mr-2" />
              Generar con IA
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="button" onClick={handleSave}>
              Guardar
            </Button>
          </div>
        )}
        {saved && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="default" onClick={onCancel}>
              Volver
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-2 min-h-0" data-color-mode={theme}>
        <label className="block mb-1 font-medium">Enunciado (Markdown)</label>
        <div className="flex-1 min-h-0">
          <MDEditor 
            value={text} 
            onChange={v => setText(v || '')} 
            height="100%" 
            style={{height: '100%'}}
            previewOptions={{
              className: 'prose prose-sm max-w-none p-4 dark:prose-invert'
            }}
            textareaProps={{
              style: { padding: '16px' }
            }}
          />
        </div>
      </div>
      <QuestionGenerationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    </div>
  );
}