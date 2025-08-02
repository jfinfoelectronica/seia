import React from 'react';
import { SecureTextarea } from './secure-textarea';
import { CodeEditor } from './code-editor';

interface ShadowProtectedInputProps {
  type: 'textarea' | 'code';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  language?: string; // Solo para type='code'
  height?: string;
  rows?: number; // Solo para type='textarea'
  disabled?: boolean;
  forceShadowDOM?: boolean; // Forzar uso de Shadow DOM
}

/**
 * Componente unificado para inputs protegidos con Shadow DOM
 * Proporciona protección contra inyección de datos por extensiones
 */
export const ShadowProtectedInput: React.FC<ShadowProtectedInputProps> = ({
  type,
  value,
  onChange,
  placeholder,
  className,
  style,
  language = 'javascript',
  height = '100%',
  rows = 4,
  disabled = false,
  forceShadowDOM = true
}) => {
  // Detectar si el navegador soporta Shadow DOM
  const supportsShadowDOM = typeof window !== 'undefined' && 
                           'attachShadow' in Element.prototype;

  // Usar Shadow DOM si está soportado y no está forzado a deshabilitado
  const useShadowDOM = supportsShadowDOM && forceShadowDOM;

  if (type === 'textarea') {
    return (
      <SecureTextarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        style={style}
        rows={rows}
        disabled={disabled}
        useShadowDOM={useShadowDOM}
      />
    );
  }

  if (type === 'code') {
    return (
      <CodeEditor
        value={value}
        onChange={onChange}
        language={language}
        height={height}
        disabled={disabled}
        useShadowDOM={useShadowDOM}
      />
    );
  }

  // Fallback en caso de tipo no reconocido
  return (
    <div className="p-4 border border-destructive rounded-md bg-destructive/10">
      <p className="text-destructive text-sm">
        Tipo de input no reconocido: {type}
      </p>
    </div>
  );
};

// Hook para verificar soporte de Shadow DOM
export const useShadowDOMSupport = () => {
  const [isSupported, setIsSupported] = React.useState(false);
  const [isChecked, setIsChecked] = React.useState(false);

  React.useEffect(() => {
    const checkSupport = () => {
      const supported = typeof window !== 'undefined' && 
                       'attachShadow' in Element.prototype &&
                       typeof ShadowRoot !== 'undefined';
      setIsSupported(supported);
      setIsChecked(true);
    };

    checkSupport();
  }, []);

  return { isSupported, isChecked };
};

// Componente de advertencia para navegadores sin soporte
export const ShadowDOMUnsupportedWarning: React.FC = () => {
  const { isSupported, isChecked } = useShadowDOMSupport();

  if (!isChecked || isSupported) {
    return null;
  }

  return (
    <div className="mb-4 p-4 border border-yellow-500 rounded-md bg-yellow-50 dark:bg-yellow-900/20">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Protección limitada
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>
              Tu navegador no soporta Shadow DOM. Los componentes funcionarán con protección básica, 
              pero se recomienda usar un navegador moderno para máxima seguridad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};