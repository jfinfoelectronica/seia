import { useRef, useCallback, useEffect } from 'react';

interface InputSecurityConfig {
  onSecurityViolation: () => void;
  suspiciousChangeThreshold?: number;
  timeWindowMs?: number;
}

export const useInputSecurity = (config: InputSecurityConfig) => {
  const {
    onSecurityViolation,
    suspiciousChangeThreshold = 50, // Caracteres por cambio sospechoso
    timeWindowMs = 100 // Ventana de tiempo para detectar cambios rápidos
  } = config;

  const lastKeyboardEvent = useRef<number>(0);
  const lastValueChange = useRef<number>(0);
  const previousValue = useRef<string>('');
  const keyboardActivityDetected = useRef<boolean>(false);
  const suspiciousActivityCount = useRef<number>(0);
  const lastMouseEvent = useRef<number>(0);
  const mouseActivityDetected = useRef<boolean>(false);

  // Registrar eventos de mouse
  const registerMouseEvent = useCallback(() => {
    lastMouseEvent.current = Date.now();
    mouseActivityDetected.current = true;
    
    // Resetear la detección después de un tiempo
    setTimeout(() => {
      mouseActivityDetected.current = false;
    }, timeWindowMs * 2);
  }, [timeWindowMs]);

  // Resetear contador de actividad sospechosa cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      suspiciousActivityCount.current = 0;
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Configurar listeners globales de mouse
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (e.isTrusted) {
        registerMouseEvent();
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.isTrusted) {
        registerMouseEvent();
      }
    };

    const handleGlobalClick = (e: MouseEvent) => {
      if (e.isTrusted) {
        registerMouseEvent();
      }
    };

    document.addEventListener('mousedown', handleGlobalMouseDown, true);
    document.addEventListener('mouseup', handleGlobalMouseUp, true);
    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      document.removeEventListener('mousedown', handleGlobalMouseDown, true);
      document.removeEventListener('mouseup', handleGlobalMouseUp, true);
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [registerMouseEvent]);

  // Registrar eventos de teclado
  const registerKeyboardEvent = useCallback(() => {
    lastKeyboardEvent.current = Date.now();
    keyboardActivityDetected.current = true;
    
    // Resetear la detección después de un tiempo
    setTimeout(() => {
      keyboardActivityDetected.current = false;
    }, timeWindowMs * 2);
  }, [timeWindowMs]);

  // Validar evento de foco
  const validateFocusEvent = useCallback((source: 'textarea' | 'monaco' = 'textarea') => {
    const now = Date.now();
    const timeSinceLastMouse = now - lastMouseEvent.current;
    
    // Detectar foco sospechoso (sin actividad de mouse reciente)
    const isSuspiciousFocus = (
      timeSinceLastMouse > timeWindowMs && !mouseActivityDetected.current
    );

    if (isSuspiciousFocus) {
      suspiciousActivityCount.current++;
      
      console.warn(`[SECURITY] Foco sospechoso detectado en ${source}:`, {
        timeSinceLastMouse,
        mouseActivityDetected: mouseActivityDetected.current,
        suspiciousCount: suspiciousActivityCount.current
      });

      // Activar violación de seguridad inmediatamente para foco no autorizado
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SECURITY] Violación de seguridad por foco no autorizado - Redirigiendo...');
      }
      onSecurityViolation();
      return false;
    }

    return true;
  }, [timeWindowMs, onSecurityViolation]);

  // Validar cambio de valor
  const validateValueChange = useCallback((newValue: string, source: 'textarea' | 'monaco' = 'textarea') => {
    const now = Date.now();
    const timeSinceLastKeyboard = now - lastKeyboardEvent.current;
    const timeSinceLastChange = now - lastValueChange.current;
    
    lastValueChange.current = now;
    
    const valueDiff = Math.abs(newValue.length - previousValue.current.length);
    previousValue.current = newValue;

    // Detectar cambios sospechosos
    const isSuspiciousChange = (
      // Cambio grande sin actividad de teclado reciente
      (valueDiff > suspiciousChangeThreshold && timeSinceLastKeyboard > timeWindowMs) ||
      // Cambio sin ninguna actividad de teclado detectada
      (!keyboardActivityDetected.current && valueDiff > 10) ||
      // Múltiples cambios rápidos sin teclado
      (timeSinceLastChange < 50 && !keyboardActivityDetected.current && valueDiff > 5)
    );

    if (isSuspiciousChange) {
      suspiciousActivityCount.current++;
      
      console.warn(`[SECURITY] Actividad sospechosa detectada en ${source}:`, {
        valueDiff,
        timeSinceLastKeyboard,
        keyboardActivityDetected: keyboardActivityDetected.current,
        suspiciousCount: suspiciousActivityCount.current
      });

      // Activar violación de seguridad después de múltiples eventos sospechosos
      if (suspiciousActivityCount.current >= 2) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[SECURITY] Violación de seguridad detectada - Redirigiendo...');
        }
        onSecurityViolation();
        return false;
      }
    }

    return true;
  }, [suspiciousChangeThreshold, timeWindowMs, onSecurityViolation]);

  // Configurar listeners de eventos de teclado y mouse
  const setupKeyboardListeners = useCallback((element: HTMLElement | null) => {
    if (!element) return () => {};

    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo registrar eventos de teclado reales (no sintéticos)
      if (e.isTrusted) {
        registerKeyboardEvent();
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.isTrusted) {
        registerKeyboardEvent();
      }
    };

    const handleInput = (e: Event) => {
      if (e.isTrusted) {
        registerKeyboardEvent();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.isTrusted) {
        registerMouseEvent();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.isTrusted) {
        registerMouseEvent();
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (e.isTrusted) {
        registerMouseEvent();
      }
    };

    const handleFocus = (e: FocusEvent) => {
      if (e.isTrusted) {
        // Determinar el tipo de elemento para el logging
        const source = element.tagName.toLowerCase() === 'textarea' ? 'textarea' : 'monaco';
        validateFocusEvent(source);
      }
    };

    element.addEventListener('keydown', handleKeyDown, true);
    element.addEventListener('keypress', handleKeyPress, true);
    element.addEventListener('input', handleInput, true);
    element.addEventListener('mousedown', handleMouseDown, true);
    element.addEventListener('mouseup', handleMouseUp, true);
    element.addEventListener('click', handleClick, true);
    element.addEventListener('focus', handleFocus, true);

    return () => {
      element.removeEventListener('keydown', handleKeyDown, true);
      element.removeEventListener('keypress', handleKeyPress, true);
      element.removeEventListener('input', handleInput, true);
      element.removeEventListener('mousedown', handleMouseDown, true);
      element.removeEventListener('mouseup', handleMouseUp, true);
      element.removeEventListener('click', handleClick, true);
      element.removeEventListener('focus', handleFocus, true);
    };
  }, [registerKeyboardEvent, registerMouseEvent, validateFocusEvent]);

  // Configurar bloqueo de clipboard (copiar/pegar)
  const setupClipboardBlocking = useCallback((element: HTMLElement | null) => {
    if (!element) return () => {};

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.warn('[SECURITY] Intento de copiar bloqueado');
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.warn('[SECURITY] Intento de cortar bloqueado');
      return false;
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.warn('[SECURITY] Intento de pegar bloqueado');
      return false;
    };

    // Bloquear atajos de teclado para clipboard
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detectar Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          e.stopPropagation();
          console.warn('[SECURITY] Atajo Ctrl+C bloqueado');
          return false;
        }
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          e.stopPropagation();
          console.warn('[SECURITY] Atajo Ctrl+V bloqueado');
          return false;
        }
        if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          e.stopPropagation();
          console.warn('[SECURITY] Atajo Ctrl+X bloqueado');
          return false;
        }
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          e.stopPropagation();
          console.warn('[SECURITY] Atajo Ctrl+A bloqueado');
          return false;
        }
      }
    };

    element.addEventListener('copy', handleCopy, true);
    element.addEventListener('cut', handleCut, true);
    element.addEventListener('paste', handlePaste, true);
    element.addEventListener('keydown', handleKeyDown, true);

    return () => {
      element.removeEventListener('copy', handleCopy, true);
      element.removeEventListener('cut', handleCut, true);
      element.removeEventListener('paste', handlePaste, true);
      element.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return {
    validateValueChange,
    validateFocusEvent,
    setupKeyboardListeners,
    setupClipboardBlocking
  };
};