# Variables de Entorno para Vercel

## Variables Requeridas

### Autenticación
```bash
# Clave secreta para NextAuth (generar con: openssl rand -base64 32)
AUTH_SECRET=tu_clave_secreta_muy_larga_y_segura

# URL de la aplicación (CRÍTICO para Vercel)
NEXTAUTH_URL=https://tu-app.vercel.app
AUTH_URL=https://tu-app.vercel.app

# Base de datos
DATABASE_URL=postgresql://usuario:password@host:puerto/database

# Clave de encriptación
ENCRYPTION_KEY=tu_clave_de_encriptacion_32_caracteres
```

### Google OAuth (Opcional)
```bash
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
```

## Configuración en Vercel

### 1. Dashboard de Vercel
1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. Settings → Environment Variables
3. Agrega cada variable con su valor correspondiente
4. Asegúrate de seleccionar los entornos correctos (Production, Preview, Development)

### 2. Variables Críticas para Autenticación

#### NEXTAUTH_URL / AUTH_URL
- **Local**: `http://localhost:3000`
- **Vercel**: `https://tu-app.vercel.app` (tu dominio real)
- **IMPORTANTE**: Debe coincidir exactamente con tu dominio de Vercel
- **IMPORTANTE**: Ambas variables deben tener el mismo valor en producción

#### AUTH_SECRET
- Generar con: `openssl rand -base64 32`
- Debe ser la misma en todos los entornos
- Mínimo 32 caracteres

### 3. Verificación de Configuración

#### Comando de Verificación
```bash
npm run verify-config
```

#### Endpoint de Salud
```bash
curl https://tu-app.vercel.app/api/health
```

## Solución de Problemas Comunes

### 1. Error: "Configuration Error"
**Causa**: Variables de entorno faltantes o incorrectas
**Solución**:
- Verificar que todas las variables requeridas estén configuradas
- Ejecutar `npm run verify-config`
- Verificar el endpoint `/api/health`

### 2. Error: "CSRF token mismatch"
**Causa**: NEXTAUTH_URL incorrecta
**Solución**:
- Asegurar que NEXTAUTH_URL coincida exactamente con el dominio
- No incluir rutas adicionales (solo el dominio base)
- Redeploy después de cambiar

### 3. Error: "Database connection failed"
**Causa**: DATABASE_URL incorrecta o base de datos inaccesible
**Solución**:
- Verificar la cadena de conexión
- Asegurar que la base de datos esté accesible desde Vercel
- Verificar credenciales y permisos

### 4. Error: "Session not found"
**Causa**: Problemas con cookies o configuración de sesión
**Solución**:
- Verificar configuración de cookies en `auth.ts`
- Asegurar que `trustHost: true` esté configurado
- Verificar configuración de dominio

### 5. Infinite Redirect Loop
**Causa**: Configuración incorrecta de middleware o URLs
**Solución**:
- Verificar rutas públicas en middleware
- Asegurar que `/api/auth/*` esté excluido del middleware
- Verificar configuración de redirects en `next.config.js`

## Configuración Específica para Vercel

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXTAUTH_URL || 'https://tu-app.vercel.app'
          },
        ],
      },
    ];
  },
};
```

### vercel.json
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/auth/(.*)",
      "destination": "/api/auth/$1"
    }
  ]
}
```

## Comandos Útiles

### Verificación Local
```bash
# Verificar configuración
npm run verify-config

# Verificar variables de entorno
echo $NEXTAUTH_URL
echo $AUTH_SECRET
```

### Verificación en Vercel
```bash
# Ver logs
vercel logs

# Redeploy
vercel --prod

# Verificar salud de la aplicación
curl https://tu-app.vercel.app/api/health
```

## Checklist de Deployment

- [ ] Todas las variables de entorno configuradas en Vercel
- [ ] NEXTAUTH_URL apunta al dominio correcto
- [ ] AUTH_SECRET configurado (32+ caracteres)
- [ ] DATABASE_URL accesible desde Vercel
- [ ] Google OAuth configurado (si se usa)
- [ ] Endpoint `/api/health` responde correctamente
- [ ] Login funciona sin errores en consola
- [ ] Middleware permite rutas correctas
- [ ] Cookies se configuran correctamente

## Debugging

### Logs de Desarrollo
- Activar `debug: true` en `auth.ts` para desarrollo
- Revisar consola del navegador para errores
- Verificar Network tab para requests fallidos

### Logs de Producción
- Usar `vercel logs` para ver logs del servidor
- Verificar `/api/health` para estado general
- Revisar variables de entorno en dashboard de Vercel

### Variables de Debug
```bash
# Solo para desarrollo
NEXTAUTH_DEBUG=true
NODE_ENV=development
```

## Contacto y Soporte

Si los problemas persisten después de seguir esta guía:
1. Verificar logs de Vercel
2. Revisar configuración de dominio
3. Verificar estado de la base de datos
4. Contactar soporte si es necesario

---

**Nota**: Después de cambiar cualquier variable de entorno en Vercel, es necesario hacer un redeploy para que los cambios tomen efecto.