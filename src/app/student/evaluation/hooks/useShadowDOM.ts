import { useEffect, useRef, useState } from 'react';

interface ShadowDOMOptions {
  mode?: 'open' | 'closed';
  delegatesFocus?: boolean;
}

export const useShadowDOM = (options: ShadowDOMOptions = { mode: 'closed', delegatesFocus: false }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;

    try {
      // Crear Shadow DOM con modo cerrado para máxima protección
      const shadowRoot = hostRef.current.attachShadow({
        mode: options.mode || 'closed',
        delegatesFocus: options.delegatesFocus || false
      });

      shadowRootRef.current = shadowRoot;

      // Inyectar estilos CSS globales en el Shadow DOM
      const styleElement = document.createElement('style');
      
      // Obtener estilos de Tailwind y otros estilos globales
      const globalStyles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch {
            // Algunos stylesheets pueden tener restricciones CORS
            return '';
          }
        })
        .join('\n');

      // Estilos adicionales para asegurar el aislamiento
      const isolationStyles = `
        :host {
          display: block;
          isolation: isolate;
          contain: layout style paint;
        }
        
        * {
          box-sizing: border-box;
        }
        
        /* Prevenir manipulación externa */
        :host([data-protected="true"]) {
          pointer-events: auto !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        
        /* Estilos específicos para textarea */
        textarea {
          border: 1px solid hsl(var(--border));
          background: transparent;
          color: hsl(var(--foreground));
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          resize: none;
          min-height: 4rem;
          width: 100%;
        }
        
        textarea:focus {
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 3px hsl(var(--ring) / 0.5);
        }
        
        textarea::placeholder {
          color: hsl(var(--muted-foreground));
        }
        
        /* Variables CSS para temas */
        :host {
          --background: 0 0% 100%;
          --foreground: 222.2 84% 4.9%;
          --border: 214.3 31.8% 91.4%;
          --ring: 222.2 84% 4.9%;
          --muted-foreground: 215.4 16.3% 46.9%;
        }
        
        @media (prefers-color-scheme: dark) {
          :host {
            --background: 222.2 84% 4.9%;
            --foreground: 210 40% 98%;
            --border: 217.2 32.6% 17.5%;
            --ring: 212.7 26.8% 83.9%;
            --muted-foreground: 215 20.2% 65.1%;
          }
        }
      `;

      styleElement.textContent = globalStyles + '\n' + isolationStyles;
      shadowRoot.appendChild(styleElement);

      // Marcar el host como protegido
      hostRef.current.setAttribute('data-protected', 'true');

      // Prevenir acceso externo al Shadow DOM
      Object.defineProperty(hostRef.current, 'shadowRoot', {
        value: null,
        writable: false,
        configurable: false
      });

      // Bloquear métodos que podrían exponer el Shadow DOM
      hostRef.current.attachShadow = () => {
        throw new Error('Shadow DOM access denied');
      };

      setIsReady(true);

      // Cleanup
      return () => {
        const currentHost = hostRef.current;
        if (currentHost) {
          currentHost.removeAttribute('data-protected');
        }
        setIsReady(false);
      };

    } catch (error) {
      console.error('Error creating Shadow DOM:', error);
      setIsReady(false);
    }
  }, [options.mode, options.delegatesFocus]);

  const appendToShadow = (element: HTMLElement) => {
    if (shadowRootRef.current && isReady) {
      shadowRootRef.current.appendChild(element);
    }
  };

  const clearShadow = () => {
    if (shadowRootRef.current && isReady) {
      shadowRootRef.current.innerHTML = '';
      // Re-agregar estilos
      const styleElement = document.createElement('style');
      const globalStyles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch {
            return '';
          }
        })
        .join('\n');
      
      styleElement.textContent = globalStyles;
      shadowRootRef.current.appendChild(styleElement);
    }
  };

  return {
    hostRef,
    shadowRoot: shadowRootRef.current,
    isReady,
    appendToShadow,
    clearShadow
  };
};