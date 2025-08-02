import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Verificar variables de entorno críticas
    const requiredEnvVars = [
      'AUTH_SECRET',
      'DATABASE_URL',
      'NEXTAUTH_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nextauth_url: process.env.NEXTAUTH_URL,
      auth_url: process.env.AUTH_URL,
      vercel_env: process.env.VERCEL_ENV,
      vercel_url: process.env.VERCEL_URL,
      missing_env_vars: missingVars,
      database_connected: !!process.env.DATABASE_URL,
      auth_configured: !!process.env.AUTH_SECRET,
    };

    // Si faltan variables críticas, devolver error
    if (missingVars.length > 0) {
      return NextResponse.json(
        { 
          ...healthData, 
          status: 'error',
          message: `Missing required environment variables: ${missingVars.join(', ')}` 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(healthData);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}