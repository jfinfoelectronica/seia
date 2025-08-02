'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
// import { importEvaluacion } from '../actions';

interface ImportEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportEvaluationModal({
  isOpen,
  onClose,
}: ImportEvaluationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
      setStatus('idle');
      setErrorMessage('');
    } else {
      setErrorMessage('Por favor selecciona un archivo JSON válido.');
      setFile(null);
    }
  };

  const handleImport = async () => {
    alert('La importación de evaluaciones aún no está implementada en admin.');
  };

  const handleClose = () => {
    setFile(null);
    setStatus('idle');
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Evaluación
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                ¡Evaluación importada exitosamente!
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
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Selecciona un archivo JSON que contenga una evaluación exportada.
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FileText className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium">
                  {file ? file.name : 'Haz clic para seleccionar archivo JSON'}
                </span>
                <span className="text-xs text-gray-500">
                  Solo archivos JSON
                </span>
              </label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || status === 'success'}
          >
            {status === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                ¡Importado!
              </>
            ) : (
              'Importar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 