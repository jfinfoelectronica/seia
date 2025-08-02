'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PenTool, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  // Asegurar que el componente esté montado y el tema cargado
  useEffect(() => {
    setMounted(true);
    
    // Verificar errores en la URL (desde middleware o NextAuth)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlError = urlParams.get('error');
      const urlMessage = urlParams.get('message');
      const urlDebug = urlParams.get('debug');
      
      if (urlError) {
        let errorMessage = '';
        switch (urlError) {
          case 'AccessDenied':
            errorMessage = urlMessage || 'No tienes permisos para acceder a esta área';
            break;
          case 'MiddlewareError':
            errorMessage = 'Error de autenticación del servidor';
            if (urlDebug && process.env.NODE_ENV === 'development') {
              setDebugInfo(`Debug: ${urlDebug}`);
            }
            break;
          case 'Configuration':
            errorMessage = 'Error de configuración del servidor';
            break;
          case 'Verification':
            errorMessage = 'Error de verificación de token';
            break;
          default:
            errorMessage = 'Error de autenticación';
        }
        setError(errorMessage);
        
        // Limpiar la URL sin recargar la página
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
    
    // Esperar a que el tema esté completamente cargado
    const checkTheme = () => {
      if (typeof window !== 'undefined') {
        // Verificar si hay un tema personalizado guardado
        const savedTheme = localStorage.getItem('selected-theme');
        if (savedTheme) {
          // Si hay un tema guardado, aplicarlo
          const themeClasses = ['purple-theme', 'amber-theme', 'blue-theme', 'bold-tech', 'notebook'];
          const hasCustomTheme = themeClasses.some(cls => document.documentElement.classList.contains(cls));
          
          if (!hasCustomTheme && savedTheme !== 'light' && savedTheme !== 'dark' && savedTheme !== 'system') {
            // Aplicar el tema si no está aplicado
            document.documentElement.classList.add(savedTheme);
          }
        } else {
          // Si no hay tema guardado, aplicar blue-theme por defecto
          document.documentElement.classList.add('blue-theme');
          localStorage.setItem('selected-theme', 'blue-theme');
        }
        setThemeLoaded(true);
      }
    };

    // Verificar inmediatamente y luego con un pequeño delay para asegurar que el tema se aplique
    checkTheme();
    const timer = setTimeout(checkTheme, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setDebugInfo('');

    try {
      console.log('Attempting login with:', { email, env: process.env.NODE_ENV });
      
      // Información de debug para Vercel
      if (process.env.NODE_ENV === 'development') {
        setDebugInfo(`Entorno: ${process.env.NODE_ENV}, URL: ${window.location.origin}`);
      }
      
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      console.log('SignIn result:', result);

      // Primero verificar si fue exitoso
      if (result?.ok) {
        console.log('SignIn successful, getting session...');
        
        // Obtener la sesión actualizada para verificar el rol
        const session = await getSession();
        console.log('Session obtained:', session);
        
        if (session?.user?.role) {
          console.log('User role found:', session.user.role);
          // Redirigir según el rol del usuario
          if (session.user.role === 'ADMIN') {
            console.log('Redirecting to admin...');
            router.push('/admin');
          } else if (session.user.role === 'TEACHER') {
            console.log('Redirecting to teacher...');
            router.push('/teacher');
          } else {
            console.log('Invalid role, redirecting to login...');
            // Si no tiene un rol válido, cerrar sesión y redirigir a login
            await signOut({ redirect: false });
            setError('No tienes permisos para acceder al sistema.');
          }
        } else {
          console.log('No role found, redirecting to login...');
          // Si no hay rol, cerrar sesión y redirigir a login
          await signOut({ redirect: false });
          setError('No tienes permisos para acceder al sistema.');
        }
      } else if (result?.error) {
        console.log('SignIn error:', result.error);
        
        // Manejo específico de errores de NextAuth
        let errorMessage = '';
        switch (result.error) {
          case 'CredentialsSignin':
            errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
            break;
          case 'Configuration':
            errorMessage = 'Error de configuración del servidor. Contacta al administrador.';
            if (process.env.NODE_ENV === 'development') {
              setDebugInfo('Error de configuración de NextAuth');
            }
            break;
          case 'AccessDenied':
            errorMessage = 'Acceso denegado. No tienes permisos para acceder.';
            break;
          case 'Verification':
            errorMessage = 'Error de verificación. Intenta nuevamente.';
            break;
          default:
            errorMessage = `Error de autenticación: ${result.error}`;
            if (process.env.NODE_ENV === 'development') {
              setDebugInfo(`Error específico: ${result.error}`);
            }
        }
        setError(errorMessage);
      } else {
        console.log('Unexpected result:', result);
        setError('Ocurrió un error inesperado. Por favor, inténtalo de nuevo.');
        if (process.env.NODE_ENV === 'development') {
          setDebugInfo(`Resultado inesperado: ${JSON.stringify(result)}`);
        }
      }
    } catch (error) {
      console.error('Error durante el login:', error);
      setError('Ocurrió un error al iniciar sesión. Por favor, inténtalo de nuevo.');
      if (process.env.NODE_ENV === 'development') {
        setDebugInfo(`Error de excepción: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // No renderizar hasta que esté montado y el tema cargado
  if (!mounted || !themeLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-6 text-center pb-8">
            <div className="flex justify-center">
              <div className="flex items-center gap-3 p-3 rounded-full bg-primary/10">
                <PenTool className="h-8 w-8 text-primary" />
                <span className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  SEIAC
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-foreground">
                Iniciar Sesión
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Ingresa tus credenciales para acceder al sistema de evaluación
              </CardDescription>
            </div>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 px-8">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base bg-background border-border focus:border-primary/50 focus:ring-ring transition-colors"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 text-base bg-background border-border focus:border-primary/50 focus:ring-ring transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              {error && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              {debugInfo && process.env.NODE_ENV === 'development' && (
                <Alert className="border-yellow-500/50 bg-yellow-50/10">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700 font-mono text-xs">
                    {debugInfo}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            
            <CardFooter className="px-8 pt-6 pb-8">
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 shadow-lg hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Iniciando sesión...
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        {/* Información adicional */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sistema de Evaluación con Inteligencia Artificial
          </p>
        </div>
      </div>
    </div>
  );
}