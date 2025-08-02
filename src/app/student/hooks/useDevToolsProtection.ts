import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import devtools from 'devtools-detect';

export function useDevToolsProtection() {
  const router = useRouter();

  useEffect(() => {
    const handleDevTools = (event: CustomEvent<{ isOpen: boolean }>) => {
      if (event.detail.isOpen) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[SECURITY] DevTools detectadas - Redirigiendo a página de violación de seguridad');
        }
        router.push('/student/security-violation');
      }
    };

    window.addEventListener('devtoolschange', handleDevTools as EventListener);
    
    // Verificar si las DevTools ya están abiertas al cargar
    if (devtools.isOpen) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SECURITY] DevTools ya abiertas al cargar - Redirigiendo a página de violación de seguridad');
      }
      router.push('/student/security-violation');
    }

    return () => {
      window.removeEventListener('devtoolschange', handleDevTools as EventListener);
    };
  }, [router]);

  return {
    // Este hook no retorna nada, solo maneja la protección
  };
}