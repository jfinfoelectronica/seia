'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function SecurityViolationPage() {
  const router = useRouter();

  useEffect(() => {
    // Limpiar cualquier dato sensible del localStorage/sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Silenciar errores de limpieza de storage
    }

    // Prevenir navegación hacia atrás
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', () => {
      window.history.pushState(null, '', window.location.href);
    });

    // Reportar la violación de seguridad de forma silenciosa
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('[SECURITY] Acceso bloqueado por violación de seguridad');
    }
  }, []);

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          Acceso Restringido
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Se ha detectado actividad no autorizada. Por motivos de seguridad, el acceso ha sido bloqueado.
        </p>
        <Button 
          onClick={handleGoHome}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
        >
          <Home className="h-4 w-4" />
          Ir al Inicio
        </Button>
      </div>
    </div>
  );
}