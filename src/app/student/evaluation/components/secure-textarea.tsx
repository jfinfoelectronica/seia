import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ShadowTextarea } from './shadow-textarea';
import { useInputSecurity } from '../hooks/useInputSecurity';

interface SecureTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  useShadowDOM?: boolean;
  rows?: number;
  disabled?: boolean;
  spellCheck?: boolean;
}

export const SecureTextarea: React.FC<SecureTextareaProps> = ({
  value,
  onChange,
  placeholder,
  className,
  style,
  useShadowDOM = true,
  rows = 4,
  disabled = false,
  spellCheck = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Aplicar medidas de seguridad
  useInputSecurity({
    onSecurityViolation: () => {
      console.warn('[SECURITY] Violación de seguridad detectada en textarea');
      // Aquí podrías redirigir o tomar otras acciones de seguridad
    }
  });

  // Si useShadowDOM está habilitado, usar el componente protegido
  if (useShadowDOM) {
    return (
      <ShadowTextarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        style={style}
        rows={rows}
        disabled={disabled}
        spellCheck={spellCheck}
      />
    );
  }

  // Fallback al textarea tradicional (para compatibilidad)
  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      rows={rows}
      disabled={disabled}
      spellCheck={spellCheck}
      style={{
        ...style,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        resize: 'none',
        overflowY: 'auto'
      }}
      onKeyDown={(e) => {
        // Prevenir Ctrl+C, Ctrl+V, Ctrl+X
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
          e.preventDefault();
        }
      }}
    />
  );
};