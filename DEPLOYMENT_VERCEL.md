# Guía de Despliegue en Vercel - SEIAC

Esta guía te ayudará a desplegar el Sistema de Evaluación Inteligente con IA (SEIAC) en Vercel.

## 📋 Prerrequisitos

- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [GitHub](https://github.com) (si usas repositorio Git)
- Base de datos PostgreSQL (recomendado: [Neon](https://neon.tech) o [Supabase](https://supabase.com))
- API Key de Google Gemini

## 🚀 Pasos para el Despliegue

### 1. Preparación del Repositorio

```bash
# Asegúrate de que tu código esté en un repositorio Git
git init
git add .
git commit -m "Initial commit for Vercel deployment"
git branch -M main
git remote add origin https://github.com/tu-usuario/seiac.git
git push -u origin main
```

### 2. Configuración de la Base de Datos

#### Opción A: Neon (Recomendado)
1. Ve a [Neon.tech](https://neon.tech)
2. Crea una nueva cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Copia la cadena de conexión (DATABASE_URL)

#### Opción B: Supabase
1. Ve a [Supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a Settings > Database
4. Copia la cadena de conexión

### 3. Configuración en Vercel

1. **Conectar Repositorio:**
   - Ve a [Vercel Dashboard](https://vercel.com/dashboard)
   - Haz clic en "New Project"
   - Importa tu repositorio de GitHub
   - Selecciona el framework: **Next.js**

2. **Variables de Entorno:**
   En la sección "Environment Variables", agrega las siguientes variables:

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@host:5432/database

# Autenticación (IMPORTANTE: usar la misma clave para ambas)
AUTH_SECRET=tu_auth_secret_muy_seguro_aqui
NEXTAUTH_URL=https://tu-app.vercel.app

# Google OAuth (si usas login con Google)
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Google Gemini API
GEMINI_API_KEY=tu_gemini_api_key_aqui

# Configuración de entorno
NODE_ENV=production
```

**⚠️ IMPORTANTE:** 
- Solo necesitas `AUTH_SECRET`, NO uses `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` debe coincidir EXACTAMENTE con tu dominio de producción
- Las variables deben estar configuradas en Vercel Dashboard > Settings > Environment Variables

### 4. Configuración de Build

Vercel debería detectar automáticamente la configuración, pero verifica:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install"
}
```

### 5. Configuración de Prisma

Agrega estos scripts en tu `package.json` si no los tienes:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "prisma db seed"
  }
}
```

### 6. Despliegue

1. Haz clic en **"Deploy"** en Vercel
2. Espera a que termine el build
3. Una vez desplegado, ejecuta las migraciones:

```bash
# En tu terminal local, conectado a la base de datos de producción
npx prisma migrate deploy
npx prisma db seed
```

## 🔧 Configuración Post-Despliegue

### 1. Configurar Dominio (Opcional)

1. Ve a tu proyecto en Vercel
2. Settings > Domains
3. Agrega tu dominio personalizado
4. Actualiza `NEXTAUTH_URL` con tu nuevo dominio

### 2. Verificar Funcionalidad

Prueba las siguientes funciones:
- [ ] Login de usuarios
- [ ] Creación de evaluaciones
- [ ] Sistema de detección de fraude
- [ ] Evaluación con IA
- [ ] Generación de reportes

### 3. Configurar Logs y Monitoreo

1. Ve a tu proyecto en Vercel
2. Functions > View Function Logs
3. Configura alertas si es necesario

## 🔒 Variables de Entorno Detalladas

### Generar AUTH_SECRET y NEXTAUTH_SECRET

```bash
# Genera secretos seguros
openssl rand -base64 32
```

### Configurar GEMINI_API_KEY

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una nueva API Key
3. Copia la clave y agrégala a las variables de entorno

## 🐛 Solución de Problemas Comunes

### Error de Build

```bash
# Si hay errores de TypeScript
npm run type-check

# Si hay errores de Prisma
npx prisma generate
npx prisma db push
```

### Error de Base de Datos

1. Verifica que `DATABASE_URL` sea correcta
2. Asegúrate de que la base de datos esté accesible
3. Ejecuta las migraciones manualmente:

```bash
npx prisma migrate deploy
```

### Error de Autenticación

**Síntomas comunes:**
- Login funciona en desarrollo pero no en producción
- Usuarios son redirigidos constantemente al login
- Error "Invalid JWT" o "No session found"

**Soluciones:**

1. **Verificar Variables de Entorno:**
   ```bash
   # En Vercel Dashboard > Settings > Environment Variables
   AUTH_SECRET=tu_clave_secreta_aqui
   NEXTAUTH_URL=https://tu-dominio-exacto.vercel.app
   ```

2. **Problemas con NODE_ENV=production:**
   - NextAuth es más estricto en producción
   - Requiere HTTPS (Vercel lo proporciona automáticamente)
   - Las cookies de sesión tienen configuraciones diferentes

3. **Verificar NEXTAUTH_URL:**
   ```bash
   # INCORRECTO:
   NEXTAUTH_URL=http://tu-app.vercel.app  # ❌ HTTP en lugar de HTTPS
   NEXTAUTH_URL=https://tu-app.vercel.app/  # ❌ Barra final
   
   # CORRECTO:
   NEXTAUTH_URL=https://tu-app.vercel.app  # ✅ HTTPS sin barra final
   ```

4. **Regenerar AUTH_SECRET:**
   ```bash
   # Genera una nueva clave segura
   openssl rand -base64 32
   ```

5. **Verificar en Logs de Vercel:**
   - Ve a tu proyecto en Vercel
   - Functions > View Function Logs
   - Busca errores relacionados con "auth", "jwt", o "session"

6. **Limpiar Cache del Navegador:**
   - Las cookies de desarrollo pueden interferir
   - Usa modo incógnito para probar

## 📊 Optimizaciones de Rendimiento

### 1. Configurar Edge Runtime (Opcional)

En páginas que no usen Prisma directamente:

```javascript
export const runtime = 'edge'
```

### 2. Configurar ISR (Incremental Static Regeneration)

Para páginas de reportes:

```javascript
export const revalidate = 3600 // 1 hora
```

### 3. Optimizar Imágenes

Asegúrate de usar `next/image` para todas las imágenes.

## 🔄 Actualizaciones y CI/CD

### Configurar Auto-Deploy

Vercel automáticamente desplegará cuando hagas push a la rama `main`.

### Preview Deployments

Cada Pull Request creará un deployment de preview automáticamente.

### Configurar Branch Protection

En GitHub:
1. Settings > Branches
2. Add rule para `main`
3. Require status checks (Vercel)

## 📝 Checklist Final

- [ ] Repositorio en GitHub configurado
- [ ] Base de datos PostgreSQL creada
- [ ] Variables de entorno configuradas en Vercel
- [ ] Proyecto desplegado exitosamente
- [ ] Migraciones de base de datos ejecutadas
- [ ] Datos semilla cargados (opcional)
- [ ] Funcionalidades principales probadas
- [ ] Dominio personalizado configurado (opcional)
- [ ] Monitoreo y logs configurados

## 🆘 Soporte

Si encuentras problemas durante el despliegue:

1. Revisa los logs en Vercel Dashboard
2. Verifica las variables de entorno
3. Asegúrate de que la base de datos esté accesible
4. Consulta la [documentación de Vercel](https://vercel.com/docs)

---

**¡Felicidades! Tu aplicación SEIAC debería estar funcionando en producción.** 🎉

Para cualquier problema específico, revisa los logs de Vercel y asegúrate de que todas las variables de entorno estén correctamente configuradas.