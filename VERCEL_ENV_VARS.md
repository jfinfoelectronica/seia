# Variables de Entorno para Vercel

## Variables Requeridas

Configura estas variables en el dashboard de Vercel (Settings > Environment Variables):

### 1. AUTH_SECRET
```
AUTH_SECRET=tu_secreto_super_seguro_aqui
```
**Importante**: Genera un secreto único y seguro. Puedes usar:
```bash
openssl rand -base64 32
```

### 2. NEXTAUTH_URL
```
NEXTAUTH_URL=https://tu-dominio.vercel.app
```
**Nota**: Reemplaza con tu dominio real de Vercel

### 3. AUTH_URL (igual que NEXTAUTH_URL)
```
AUTH_URL=https://tu-dominio.vercel.app
```

### 4. DATABASE_URL
```
DATABASE_URL=postgresql://usuario:password@host:puerto/database?sslmode=require
```
**Nota**: URL de conexión a tu base de datos PostgreSQL (Supabase, Railway, etc.)

### 5. ENCRYPTION_KEY
```
ENCRYPTION_KEY=tu_clave_de_encriptacion_aqui
```

## Variables Opcionales (Google OAuth)

Si usas autenticación con Google:

```
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
```

## Configuración en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Navega a Settings > Environment Variables
3. Agrega cada variable una por una
4. Asegúrate de seleccionar todos los entornos (Production, Preview, Development)
5. Haz un nuevo deploy después de configurar las variables

## Archivos de Configuración Incluidos

- `vercel.json`: Configuración específica para Vercel
- `src/auth.ts`: Configuración de NextAuth optimizada para producción
- `src/middleware.ts`: Middleware robusto con manejo de errores

## Solución de Problemas Comunes

### Problema: Redirección infinita al login
**Solución**: Verifica que `NEXTAUTH_URL` y `AUTH_URL` apunten a tu dominio de producción

### Problema: Error de base de datos
**Solución**: Asegúrate de que `DATABASE_URL` incluya `?sslmode=require` para conexiones SSL

### Problema: Sesiones no persisten
**Solución**: Verifica que `AUTH_SECRET` esté configurado correctamente

## Comandos Útiles

Generar AUTH_SECRET:
```bash
openssl rand -base64 32
```

Verificar variables en Vercel CLI:
```bash
vercel env ls
```

## Notas Importantes

- ⚠️ **NUNCA** commits secretos al repositorio
- 🔄 Redeploy después de cambiar variables de entorno
- 🔒 Usa HTTPS en producción (Vercel lo maneja automáticamente)
- 📝 Mantén un backup seguro de tus variables de entorno