/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuraciones específicas para Vercel
  serverExternalPackages: ['@prisma/client'],
  
  // Configuración de headers para CORS y seguridad
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? process.env.NEXTAUTH_URL || 'https://your-domain.vercel.app'
              : 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
        ],
      },
    ];
  },

  // Configuración de redirects para autenticación
  async redirects() {
    return [
      // Redirigir la raíz a login si no está autenticado
      // Esto se maneja mejor en middleware, pero como fallback
      {
        source: '/',
        has: [
          {
            type: 'cookie',
            key: 'next-auth.session-token',
            value: undefined,
          },
        ],
        destination: '/login',
        permanent: false,
      },
    ];
  },

  // Configuración de rewrites para API de autenticación
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
    ];
  },

  // Configuración de variables de entorno
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_URL: process.env.AUTH_URL,
  },

  // Configuración para Vercel
  ...(process.env.VERCEL && {
    // Configuraciones específicas para Vercel
    generateEtags: false,
    poweredByHeader: false,
  }),
};

module.exports = nextConfig;