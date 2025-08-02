import { useState, useEffect, useRef } from 'react';

export function usePageVisibility() {
  const [isPageHidden, setIsPageHidden] = useState(false);
  const originalTitleRef = useRef<string>('');

  // Efecto para detectar cuando la página está oculta
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageHidden(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Efecto para manejar el cambio de título cuando la página está oculta
  useEffect(() => {
    let titleInterval: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      setIsPageHidden(document.hidden);
      
      if (document.hidden) {
        // Cuando la página está oculta, alternar el título más rápidamente
        let showWarning = true;
        titleInterval = setInterval(() => {
          document.title = showWarning ? '🚨 ¡ALERTA! ¡Vuelve a la evaluación!' : '⚠️ ¡No abandones la evaluación!';
          showWarning = !showWarning;
        }, 800); // Reducido a 800ms para un parpadeo más rápido
      } else {
        // Cuando la página está visible, restaurar el título original
        clearInterval(titleInterval);
        document.title = originalTitleRef.current;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(titleInterval);
      document.title = originalTitleRef.current;
    };
  }, []);

  // Función para establecer el título original
  const setOriginalTitle = (title: string) => {
    originalTitleRef.current = title;
    if (!document.hidden) {
      document.title = title;
    }
  };

  return {
    isPageHidden,
    setOriginalTitle
  };
}