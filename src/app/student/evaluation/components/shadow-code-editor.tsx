import React, { useEffect, useRef, useState } from 'react';
import { useShadowDOM } from '../hooks/useShadowDOM';
import { useInputSecurity } from '../hooks/useInputSecurity';
import { useMonacoConfig } from '../hooks/useMonacoConfig';
import type { editor } from 'monaco-editor';

interface ShadowCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
  disabled?: boolean;
}

export const ShadowCodeEditor: React.FC<ShadowCodeEditorProps> = ({
  value,
  onChange,
  language,
  height = '100%',
  disabled = false
}) => {
  const { hostRef, shadowRoot, isReady } = useShadowDOM({ mode: 'closed', delegatesFocus: true });
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [internalValue, setInternalValue] = useState(value);
  const [isMonacoLoaded, setIsMonacoLoaded] = useState(false);
  const { getEditorOptions, currentTheme } = useMonacoConfig();

  // Aplicar medidas de seguridad
  useInputSecurity({
    onSecurityViolation: () => {
      console.warn('[SECURITY] Violación de seguridad detectada en Shadow Monaco Editor');
      // Disparar evento de fraude detectado
      const fraudEvent = new CustomEvent('fraud-detected', {
        detail: { type: 'security-violation', source: 'monaco' }
      });
      window.dispatchEvent(fraudEvent);
    }
  });

  // Lenguajes que soportan formateo
  const FORMATTABLE_LANGUAGES = [
    'javascript', 'typescript', 'json', 'css', 'html', 'markdown'
  ];
  const canFormat = FORMATTABLE_LANGUAGES.includes(language);

  useEffect(() => {
    if (!shadowRoot || !isReady) return;

    // Crear contenedor para Monaco dentro del Shadow DOM
    const container = document.createElement('div');
    container.style.cssText = `
      width: 100%;
      height: ${height};
      position: relative;
      border-radius: 0.5rem;
      overflow: hidden;
      background: hsl(var(--background));
      border: 1px solid hsl(var(--border));
    `;

    // Crear contenedor para el botón de formateo
    const formatButtonContainer = document.createElement('div');
    formatButtonContainer.style.cssText = `
      position: absolute;
      bottom: 8px;
      right: 12px;
      z-index: 10;
    `;

    if (canFormat) {
      const formatButton = document.createElement('button');
      formatButton.textContent = 'Formatear documento';
      formatButton.type = 'button';
      formatButton.style.cssText = `
        font-size: 0.75rem;
        color: hsl(var(--primary));
        background: transparent;
        border: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
        text-decoration: none;
      `;
      
      formatButton.addEventListener('mouseenter', () => {
        formatButton.style.textDecoration = 'underline';
      });
      
      formatButton.addEventListener('mouseleave', () => {
        formatButton.style.textDecoration = 'none';
      });

      formatButton.addEventListener('click', () => {
        if (editorRef.current) {
          editorRef.current.getAction('editor.action.formatDocument')?.run();
        }
      });

      formatButtonContainer.appendChild(formatButton);
    }

    container.appendChild(formatButtonContainer);
    shadowRoot.appendChild(container);
    containerRef.current = container;

    // Cargar Monaco Editor dinámicamente
    const loadMonaco = async () => {
      try {
        // Importar Monaco Editor
        const monaco = await import('monaco-editor');
        
        // Configurar Monaco para trabajar dentro del Shadow DOM
        const editorContainer = document.createElement('div');
        editorContainer.style.cssText = `
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
        `;
        
        container.insertBefore(editorContainer, formatButtonContainer);

        // Crear el editor
        const editor = monaco.editor.create(editorContainer, {
          value: value,
          language: language,
          theme: currentTheme,
          ...getEditorOptions(window.innerWidth < 640),
          readOnly: disabled,
          contextmenu: false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          domReadOnly: false,
          accessibilitySupport: 'off',
          folding: false,
          lineNumbers: 'on',
          padding: { top: 0, bottom: 0 },
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
          }
        });

        editorRef.current = editor;

        // Event listeners para seguridad
        editor.onDidChangeModelContent(() => {
          const newValue = editor.getValue();
          setInternalValue(newValue);
          onChange(newValue);
        });

        editor.onKeyDown((e) => {
          // Prevenir combinaciones de teclas peligrosas
          if ((e.ctrlKey || e.metaKey) && 
              (e.keyCode === monaco.KeyCode.KeyC || 
               e.keyCode === monaco.KeyCode.KeyV || 
               e.keyCode === monaco.KeyCode.KeyX ||
               e.keyCode === monaco.KeyCode.KeyA ||
               e.keyCode === monaco.KeyCode.KeyS)) {
            e.preventDefault();
            e.stopPropagation();
            
            // Disparar evento de fraude detectado
            const fraudEvent = new CustomEvent('fraud-detected', {
              detail: { type: 'restricted-shortcut', key: e.browserEvent.key }
            });
            window.dispatchEvent(fraudEvent);
            return false;
          }
        });

        // Prevenir menú contextual
        const editorDom = editor.getDomNode();
        if (editorDom) {
          editorDom.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            const fraudEvent = new CustomEvent('fraud-detected', {
              detail: { type: 'context-menu' }
            });
            window.dispatchEvent(fraudEvent);
          });

          editorDom.addEventListener('selectstart', (e) => {
            e.preventDefault();
          });
        }

        // Manejar redimensionamiento
        const updateEditorOptions = () => {
          const isMobile = window.innerWidth < 640;
          editor.updateOptions({
            ...getEditorOptions(isMobile),
            padding: { top: 0, bottom: 0 },
          });
        };

        window.addEventListener('resize', updateEditorOptions);

        setIsMonacoLoaded(true);

        // Cleanup function
        return () => {
          window.removeEventListener('resize', updateEditorOptions);
          editor.dispose();
        };

      } catch (error) {
        console.error('Error loading Monaco Editor:', error);
      }
    };

    const cleanup = loadMonaco();

    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
      
      if (shadowRoot.contains(container)) {
        shadowRoot.removeChild(container);
      }
      containerRef.current = null;
      editorRef.current = null;
      setIsMonacoLoaded(false);
    };
  }, [shadowRoot, isReady, language, height, disabled, currentTheme, canFormat]);

  // Sincronizar valor externo con interno
  useEffect(() => {
    if (editorRef.current && isMonacoLoaded && value !== internalValue) {
      editorRef.current.setValue(value);
      setInternalValue(value);
    }
  }, [value, internalValue, isMonacoLoaded]);

  // Aplicar estilos al host
  useEffect(() => {
    if (hostRef.current) {
      Object.assign(hostRef.current.style, {
        display: 'block',
        width: '100%',
        height: height,
        position: 'relative',
        isolation: 'isolate',
        contain: 'layout style paint'
      });
    }
  }, [height]);

  if (!isReady || !isMonacoLoaded) {
    return (
      <div 
        ref={hostRef}
        className="flex items-center justify-center bg-black rounded-lg"
        style={{ height, width: '100%' }}
      >
        <div className="text-white text-sm">
          {!isReady ? 'Inicializando editor seguro...' : 'Cargando Monaco Editor...'}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={hostRef}
      data-testid="shadow-code-editor-host"
      style={{ height, width: '100%' }}
    />
  );
};