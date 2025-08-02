import React, { useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface SecureTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  spellCheck?: boolean;
  setupKeyboardListeners: (element: HTMLElement | null) => () => void;
  setupClipboardBlocking: (element: HTMLElement | null) => () => void;
}

export const SecureTextarea = ({
  value,
  onChange,
  placeholder,
  className,
  style,
  spellCheck,
  setupKeyboardListeners,
  setupClipboardBlocking
}: SecureTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    // Configurar listeners de seguridad
    const cleanupKeyboard = setupKeyboardListeners(element);
    const cleanupClipboard = setupClipboardBlocking(element);

    return () => {
      cleanupKeyboard();
      cleanupClipboard();
    };
  }, [setupKeyboardListeners, setupClipboardBlocking]);

  return (
    <Textarea
      ref={textareaRef}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={style}
      spellCheck={spellCheck}
    />
  );
};