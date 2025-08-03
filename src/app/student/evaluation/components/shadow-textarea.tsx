import React, { useEffect, useRef, useState } from 'react';
import { useShadowDOM } from '../hooks/useShadowDOM';
import { useInputSecurity } from '../hooks/useInputSecurity';

interface ShadowTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  rows?: number;
  disabled?: boolean;
}

export const ShadowTextarea: React.FC<ShadowTextareaProps> = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  style = {},
  rows = 4,
  disabled = false
}) => {
  const { hostRef, shadowRoot, isReady } = useShadowDOM({ mode: 'closed', delegatesFocus: true });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [internalValue, setInternalValue] = useState(value);

  // Aplicar medidas de seguridad
  const { setupKeyboardListeners, setupClipboardBlocking, validateValueChange } = useInputSecurity({
    onSecurityViolation: () => {
      console.warn('[SECURITY] Violación de seguridad detectada en Shadow Textarea');
      // Disparar evento de fraude detectado
      const fraudEvent = new CustomEvent('fraud-detected', {
        detail: { type: 'security-violation', source: 'textarea' }
      });
      window.dispatchEvent(fraudEvent);
    }
  });

  useEffect(() => {
    if (!shadowRoot || !isReady) return;

    // Crear el textarea dentro del Shadow DOM
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.placeholder = placeholder;
    textarea.rows = rows;
    textarea.disabled = disabled;
    
    // Aplicar clases y estilos
    textarea.className = `shadow-textarea ${className}`;
    Object.assign(textarea.style, {
      ...style,
      userSelect: 'none',
      WebkitUserSelect: 'none',
      resize: 'none',
      overflowY: 'auto',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: 'inherit'
    });

    // Event listeners para funcionalidad
    const handleInput = (e: Event) => {
      const target = e.target as HTMLTextAreaElement;
      setInternalValue(target.value);
      onChange(target.value);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevenir combinaciones de teclas peligrosas
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        
        // Disparar evento de fraude detectado
        const fraudEvent = new CustomEvent('fraud-detected', {
          detail: { type: 'restricted-shortcut', key: e.key }
        });
        window.dispatchEvent(fraudEvent);
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      
      // Disparar evento de fraude detectado
      const fraudEvent = new CustomEvent('fraud-detected', {
        detail: { type: 'context-menu' }
      });
      window.dispatchEvent(fraudEvent);
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      
      // Disparar evento de fraude detectado
      const fraudEvent = new CustomEvent('fraud-detected', {
        detail: { type: 'paste-attempt' }
      });
      window.dispatchEvent(fraudEvent);
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      
      // Disparar evento de fraude detectado
      const fraudEvent = new CustomEvent('fraud-detected', {
        detail: { type: 'copy-attempt' }
      });
      window.dispatchEvent(fraudEvent);
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    // Agregar event listeners
    textarea.addEventListener('input', handleInput);
    textarea.addEventListener('keydown', handleKeyDown);
    textarea.addEventListener('contextmenu', handleContextMenu);
    textarea.addEventListener('paste', handlePaste);
    textarea.addEventListener('copy', handleCopy);
    textarea.addEventListener('selectstart', handleSelectStart);

    // Prevenir drag and drop
    textarea.addEventListener('dragstart', (e) => e.preventDefault());
    textarea.addEventListener('drop', (e) => e.preventDefault());

    // Agregar al Shadow DOM
    shadowRoot.appendChild(textarea);
    textareaRef.current = textarea;

    // Cleanup
    return () => {
      if (shadowRoot.contains(textarea)) {
        textarea.removeEventListener('input', handleInput);
        textarea.removeEventListener('keydown', handleKeyDown);
        textarea.removeEventListener('contextmenu', handleContextMenu);
        textarea.removeEventListener('paste', handlePaste);
        textarea.removeEventListener('copy', handleCopy);
        textarea.removeEventListener('selectstart', handleSelectStart);
        shadowRoot.removeChild(textarea);
      }
      textareaRef.current = null;
    };
  }, [shadowRoot, isReady, placeholder, rows, disabled, className]);

  // Sincronizar valor externo con interno
  useEffect(() => {
    if (textareaRef.current && value !== internalValue) {
      textareaRef.current.value = value;
      setInternalValue(value);
    }
  }, [value, internalValue]);

  // Aplicar estilos adicionales al host
  useEffect(() => {
    if (hostRef.current) {
      Object.assign(hostRef.current.style, {
        display: 'block',
        width: '100%',
        minHeight: '4rem',
        isolation: 'isolate',
        contain: 'layout style paint',
        ...style
      });
    }
  }, [style]);

  if (!isReady) {
    return (
      <div 
        ref={hostRef}
        className={`animate-pulse bg-muted rounded-md ${className}`}
        style={{ minHeight: '4rem', ...style }}
      >
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Cargando editor seguro...
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={hostRef}
      className={className}
      style={style}
      data-testid="shadow-textarea-host"
    />
  );
};