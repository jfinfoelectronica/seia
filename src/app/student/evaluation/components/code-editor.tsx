import dynamic from 'next/dynamic';
import { useMonacoConfig } from '@/app/student/evaluation/hooks/useMonacoConfig';
import { useInputSecurity } from '@/app/student/evaluation/hooks/useInputSecurity';
import React, { useRef, useEffect, useState } from 'react';
import type { editor } from 'monaco-editor';
import { useRouter } from 'next/navigation';

// Carga diferida del editor Monaco
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full bg-black rounded-lg">
        Cargando editor...
      </div>
    )
  }
);

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

export const CodeEditor = ({ value, onChange, language, height = '100%' }: CodeEditorProps) => {
  const { getEditorOptions, currentTheme, defineCustomThemes } = useMonacoConfig();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const router = useRouter();
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Sistema de seguridad para detectar entrada no autorizada
  const { validateValueChange, validateFocusEvent, setupKeyboardListeners, setupClipboardBlocking } = useInputSecurity({
    onSecurityViolation: () => {
      router.push('/student/security-violation');
    },
    suspiciousChangeThreshold: 30, // Más estricto para código
    timeWindowMs: 150
  });

  // Función segura para manejar cambios
  const handleSecureChange = (newValue: string) => {
    try {
      if (validateValueChange(newValue, 'monaco')) {
        onChange(newValue);
      }
    } catch (error) {
      console.error('[CodeEditor] Error en handleSecureChange:', error);
      setEditorError('Error al procesar el cambio en el editor');
    }
  };

  // Manejo de errores del editor
  const handleEditorError = (error: unknown) => {
    console.error('[CodeEditor] Error del editor Monaco:', error);
    setEditorError('Error al cargar el editor de código');
  };

  // Limpiar error cuando el editor se monta correctamente
  useEffect(() => {
    if (isEditorReady && editorError) {
      setEditorError(null);
    }
  }, [isEditorReady, editorError]);

  if (editorError) {
    return (
      <div className="absolute inset-0 rounded-lg overflow-hidden mx-3 sm:mx-4">
        <div className="flex items-center justify-center h-full w-full bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-center p-4">
            <p className="text-red-600 dark:text-red-400 mb-2">Error al cargar el editor</p>
            <p className="text-sm text-red-500 dark:text-red-300">{editorError}</p>
            <button 
              onClick={() => {
                setEditorError(null);
                setIsEditorReady(false);
              }}
              className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 rounded-lg overflow-hidden mx-3 sm:mx-4">
      <div className="absolute inset-0 rounded-lg overflow-hidden">
        <MonacoEditor
          height={height}
          language={language}
          value={value}
          onChange={(value) => handleSecureChange(value || '')}
          options={{
            ...getEditorOptions(window.innerWidth < 640),
            padding: { top: 0, bottom: 0 },
          }}
          theme={currentTheme}
          defaultValue=""
          className="rounded-lg overflow-hidden"
          loading={
            <div className="flex items-center justify-center h-full w-full bg-black rounded-lg">
              Cargando editor...
            </div>
          }
          onMount={(editor, monaco) => {
            try {
              // Definir temas personalizados primero
              defineCustomThemes(monaco);
              
              editorRef.current = editor;
              setIsEditorReady(true);

              // Configurar listeners de seguridad
              const editorElement = editor.getDomNode();
              if (editorElement) {
                setupKeyboardListeners(editorElement);
                setupClipboardBlocking(editorElement);
              }

              // Agregar listener de foco específico para Monaco
              editor.onDidFocusEditorText(() => {
                try {
                  validateFocusEvent('monaco');
                } catch (error) {
                  console.error('[CodeEditor] Error en validateFocusEvent:', error);
                }
              });

              // Bloquear acciones de clipboard en Monaco
              editor.addAction({
                id: 'block-copy',
                label: 'Block Copy',
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
                run: () => {
                  console.warn('[SECURITY] Intento de copiar en Monaco bloqueado');
                }
              });

              editor.addAction({
                id: 'block-paste',
                label: 'Block Paste',
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
                run: () => {
                  console.warn('[SECURITY] Intento de pegar en Monaco bloqueado');
                }
              });

              editor.addAction({
                id: 'block-cut',
                label: 'Block Cut',
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
                run: () => {
                  console.warn('[SECURITY] Intento de cortar en Monaco bloqueado');
                }
              });

              editor.addAction({
                id: 'block-select-all',
                label: 'Block Select All',
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA],
                run: () => {
                  console.warn('[SECURITY] Intento de seleccionar todo en Monaco bloqueado');
                }
              });

              const updateEditorOptions = () => {
                try {
                  const isMobile = window.innerWidth < 640;
                  editor.updateOptions({
                    ...getEditorOptions(isMobile),
                    padding: { top: 0, bottom: 0 },
                  });
                } catch (error) {
                  console.error('[CodeEditor] Error al actualizar opciones:', error);
                }
              };

              editor.updateOptions({ padding: { top: 0, bottom: 0 } });
              editor.layout();

              window.addEventListener('resize', updateEditorOptions);
              return () => window.removeEventListener('resize', updateEditorOptions);
            } catch (error) {
              console.error('[CodeEditor] Error en onMount:', error);
              handleEditorError(error);
            }
          }}
          onValidate={(markers) => {
            // Manejar errores de validación del editor
            if (markers && markers.length > 0) {
              const errors = markers.filter(marker => marker.severity === 8); // Error severity
              if (errors.length > 0) {
                console.warn('[CodeEditor] Errores de validación:', errors);
              }
            }
          }}
        />
      </div>
    </div>
  );
};