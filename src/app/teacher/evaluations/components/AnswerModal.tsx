import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, Sparkles } from 'lucide-react';
import { generateAnswer } from '@/lib/gemini-answer-generation';

export function AnswerModal({ isOpen, onClose, question, language }: {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  language?: string;
}) {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleGenerate = async () => {
    setLoading(true);
    setAnswer('');
    try {
      const res = await generateAnswer(question, language);
      setAnswer(res);
    } catch {
      setAnswer('Error al generar la respuesta.');
    } finally {
      setLoading(false);
    }
  };
  const handleCopy = () => {
    if (answer) {
      navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };
  const handleClose = () => {
    onClose();
    setAnswer('');
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Respuesta generada por IA
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <Textarea value={question} readOnly className="min-h-[60px] text-muted-foreground" />
          <Button onClick={handleGenerate} disabled={loading} variant="secondary" className="w-fit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generar respuesta
          </Button>
          <Textarea value={answer} readOnly className="min-h-[120px] max-h-[300px] overflow-auto" placeholder="La respuesta aparecerá aquí..." />
          <Button onClick={handleCopy} disabled={!answer} variant="outline" className="w-fit">
            <Copy className="h-4 w-4 mr-2" />
            {copied ? '¡Copiado!' : 'Copiar respuesta'}
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
