import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';

export function useThemeManagement() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Asegurarse de que el componente esté montado antes de acceder a localStorage
  useEffect(() => {
    setMounted(true);
  }, []);

  // Restaurar el tema seleccionado al cargar la página
  const restoreTheme = useCallback(() => {
    // Solo ejecutar en el cliente después de que el componente esté montado
    if (!mounted || typeof window === 'undefined') return;

    const savedTheme = localStorage.getItem('selected-theme');
    if (savedTheme) {
      // Si es un tema personalizado, necesitamos manejar el modo oscuro/claro por separado
      if (savedTheme !== 'light' && savedTheme !== 'dark' && savedTheme !== 'system') {
        // Aplicar el tema personalizado
        document.documentElement.classList.add(savedTheme);

        // Mantener el modo oscuro/claro actual
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = localStorage.getItem('theme') === 'dark' ||
          (localStorage.getItem('theme') === 'system' && prefersDark) ||
          (!localStorage.getItem('theme') && prefersDark);

        // Aplicar el modo oscuro/claro según corresponda
        setTheme(isDark ? 'dark' : 'light');
      } else {
        // Si no es un tema personalizado, simplemente aplicar el tema
        setTheme(savedTheme);
      }
    }
  }, [mounted, setTheme]);

  // Ejecutar la restauración del tema cuando el componente esté montado
  useEffect(() => {
    restoreTheme();
  }, [restoreTheme]);

  // Guardar tema personalizado
  const saveCustomTheme = useCallback((themeName: string) => {
    if (typeof window === 'undefined') return;

    localStorage.setItem('selected-theme', themeName);
    
    if (themeName !== 'light' && themeName !== 'dark' && themeName !== 'system') {
      document.documentElement.classList.add(themeName);
    }
  }, []);

  // Limpiar temas personalizados
  const clearCustomThemes = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Remover todas las clases de tema personalizado del documento
    const customThemes = ['theme-blue', 'theme-green', 'theme-purple', 'theme-orange'];
    customThemes.forEach(theme => {
      document.documentElement.classList.remove(theme);
    });
  }, []);

  return {
    mounted,
    restoreTheme,
    saveCustomTheme,
    clearCustomThemes
  };
}