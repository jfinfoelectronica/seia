'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface QuestionGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, questionType: string) => Promise<void>;
  isGenerating: boolean;
  // Recibe mainType y language como props desde el diseñador
  mainType: 'codigo' | 'texto';
  language?: string;
}

// Tipos de pregunta sugeridos
// (Eliminado QUESTION_TYPES porque no se usa)

export function QuestionGenerationModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  // Recibe mainType y language como props desde el diseñador
  mainType,
  language,
}: QuestionGenerationModalProps & { mainType: 'codigo' | 'texto'; language?: string }) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  // El tipo general lo provee el diseñador, solo se selecciona el subtipo aquí
  const [questionType, setQuestionType] = useState('enunciado');

  // Opciones sugeridas solo sin opción múltiple
  const questionTypeOptions = mainType === 'codigo'
    ? [
        { value: 'enunciado', label: 'Enunciado' },
        { value: 'completar_codigo', label: 'Completar código' },
        { value: 'corregir_codigo', label: 'Corregir código' }
      ]
    : [
        { value: 'enunciado', label: 'Enunciado' },
        { value: 'analisis_texto', label: 'Análisis de texto' },
        { value: 'resumir_texto', label: 'Resumir texto' }
      ];

  // Ejemplos para el placeholder según selección y lenguaje
  const placeholderExamples: Record<string, (lang?: string) => string> = {
    enunciado: (lang) => lang ? `Ej: Escribe una función en ${lang} que reciba una lista de números y devuelva la suma de los elementos pares.` : 'Ej: Escribe una función que reciba una lista de números y devuelva la suma de los elementos pares.',
    analisis_codigo: (lang) => lang ? `Ej: Analiza el siguiente código en ${lang} y explica qué realiza la función principal.` : 'Ej: Analiza el siguiente código y explica qué realiza la función principal.',
    completar_codigo: (lang) => lang ? `Ej: Completa el siguiente código en ${lang} para que la función calcule el promedio de una lista de enteros.` : 'Ej: Completa el siguiente código para que la función calcule el promedio de una lista de enteros.',
    corregir_codigo: (lang) => lang ? `Ej: Corrige los errores en el siguiente código en ${lang} para que compile y funcione correctamente.` : 'Ej: Corrige los errores en el siguiente código para que compile y funcione correctamente.',
    analisis_texto: () => 'Ej: Analiza el siguiente fragmento literario y argumenta sobre el mensaje principal del autor.',
    resumir_texto: () => 'Ej: Resume el texto proporcionado en no más de 100 palabras.'
  };
  const placeholder = placeholderExamples[questionType]
    ? placeholderExamples[questionType](mainType === 'codigo' ? language : undefined)
    : '';

  // Cambia la llamada a onGenerate para que el tipo general venga del diseñador
  const handleGenerateClick = async () => {
    if (!prompt.trim()) return;
    
    setStatus('idle');
    setErrorMessage('');
    
    try {
      // El tipo general (mainType) debe ser pasado por el diseñador
      await onGenerate(prompt, questionType);
      setStatus('success');
      setPrompt(''); // Limpiar el prompt después de generar
      
      // Cerrar el modal después de un breve delay para mostrar el éxito
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 1500);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido al generar la pregunta');
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMessage('');
    setPrompt('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Generar Pregunta con IA
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Badges de tipo y lenguaje */}
          <div className="flex gap-2 mb-2">
            <Badge variant="outline" className="text-xs px-2 py-1">
              {mainType === 'codigo' ? 'Código' : 'Texto'}
            </Badge>
            {mainType === 'codigo' && language && (
              <Badge variant="secondary" className="text-xs px-2 py-1">
                {language}
              </Badge>
            )}
          </div>
          {/* Selector de subtipo de pregunta */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs mb-1 text-muted-foreground">Tipo de pregunta</label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                ¡Pregunta generada exitosamente! Se ha copiado al editor.
              </AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-sm text-muted-foreground">
            Escribe una idea o tema para la pregunta. La IA la convertirá en un enunciado formal en formato Markdown, teniendo en cuenta el tipo y lenguaje que hayas seleccionado.
          </p>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            className="min-h-[100px]"
            disabled={isGenerating || status === 'success'}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleGenerateClick} 
            disabled={isGenerating || !prompt.trim() || status === 'success'}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                ¡Generado!
              </>
            ) : (
              'Generar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}