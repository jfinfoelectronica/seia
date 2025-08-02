import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production',
    });

    const { pathname } = request.nextUrl;

    // Rutas públicas que no requieren autenticación
    const publicPaths = [
      '/login', 
      '/api/auth',
      '/', // Página principal es pública
      '/student' // Rutas de estudiante son públicas
    ];
    const isPublicPath = publicPaths.some(path => 
      path === '/' ? pathname === '/' : pathname.startsWith(path)
    );

    // Si es una ruta pública, permitir acceso
    if (isPublicPath) {
      return NextResponse.next();
    }

    // Rutas que requieren autenticación (solo admin y teacher)
    const protectedPaths = ['/admin', '/teacher'];
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

    // Si no es una ruta protegida, permitir acceso (otras rutas públicas)
    if (!isProtectedPath) {
      return NextResponse.next();
    }

    // Para rutas protegidas, verificar autenticación
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar roles para rutas específicas protegidas
    const userRole = token.role as string | undefined;

    // Rutas de administrador - solo ADMIN
    if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'AccessDenied');
      return NextResponse.redirect(loginUrl);
    }

    // Rutas de profesor - TEACHER o ADMIN
    if (pathname.startsWith('/teacher')) {
      // Verificar si el usuario tiene el rol de TEACHER o ADMIN
      if (userRole !== 'TEACHER' && userRole !== 'ADMIN') {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'AccessDenied');
        return NextResponse.redirect(loginUrl);
      }
    }

    return NextResponse.next();
  } catch (error) {
    // En caso de error, redirigir al login
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!.*\..*|_next).*)', '/', '/(api|trpc)(.*)', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
};