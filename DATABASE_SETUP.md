# Configuración de Base de Datos - Primera Ejecución

Este documento contiene las instrucciones para configurar la base de datos por primera vez en el proyecto SEIAC.

## Prerrequisitos

- Node.js instalado
- PostgreSQL instalado y ejecutándose
- Variables de entorno configuradas en el archivo `.env`

## Variables de Entorno Requeridas

Asegúrate de tener configurado el archivo `.env` con las siguientes variables:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_base_datos?schema=public"

# Autenticación (Auth.js)
AUTH_SECRET="tu_clave_secreta_aqui"
NEXTAUTH_URL="http://localhost:3000"

# Encriptación
ENCRYPTION_KEY="tu_clave_de_encriptacion_aqui"
```

## Pasos para Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Base de Datos (Primera vez - SIN migraciones)

Si es la primera vez que configuras la base de datos y quieres crear las tablas directamente desde el schema:

```bash
# Generar el cliente de Prisma
npx prisma generate

# Crear las tablas en la base de datos basándose en el schema
npx prisma db push
```

**Nota:** `prisma db push` crea las tablas directamente desde el schema sin usar migraciones. Es ideal para desarrollo inicial.

### 3. Ejecutar el Seed (Datos Iniciales)

Para poblar la base de datos con datos iniciales (usuarios, roles, etc.):

```bash
npx prisma db seed
```

### 4. Verificar la Configuración

Para verificar que todo esté configurado correctamente:

```bash
# Ver el estado de la base de datos
npx prisma studio
```

Esto abrirá una interfaz web en `http://localhost:5555` donde podrás ver las tablas y datos creados.

## Comandos Útiles Adicionales

### Resetear Base de Datos Completamente

Si necesitas empezar desde cero:

```bash
# Eliminar todas las tablas y recrearlas
npx prisma db push --force-reset

# Ejecutar el seed nuevamente
npx prisma db seed
```

### Ver Schema de la Base de Datos

```bash
# Mostrar el SQL generado
npx prisma db pull
```

### Generar Cliente Prisma (si hay cambios en schema)

```bash
npx prisma generate
```

## Estructura de Datos Inicial

El seed creará los siguientes datos iniciales:

- **Usuario Administrador:**
  - Email: `admin@seiac.com`
  - Contraseña: `admin123`
  - Rol: ADMIN

- **Usuario Profesor:**
  - Email: `profesor@seiac.com`
  - Contraseña: `profesor123`
  - Rol: TEACHER

- **Usuario Estudiante:**
  - Email: `estudiante@seiac.com`
  - Contraseña: `estudiante123`
  - Rol: STUDENT

## Solución de Problemas

### Error de Conexión a Base de Datos

1. Verifica que PostgreSQL esté ejecutándose
2. Confirma que las credenciales en `DATABASE_URL` sean correctas
3. Asegúrate de que la base de datos especificada exista

### Error "Environment variable not found"

1. Verifica que el archivo `.env` esté en la raíz del proyecto
2. Confirma que todas las variables requeridas estén definidas
3. Reinicia el servidor de desarrollo después de cambiar variables

### Error en el Seed

1. Asegúrate de que las tablas estén creadas (`npx prisma db push`)
2. Verifica que no haya datos duplicados
3. Revisa el archivo `prisma/seed.ts` para errores

## Iniciar el Proyecto

Una vez configurada la base de datos:

```bash
npm run dev
```

El proyecto estará disponible en `http://localhost:3000`

## Notas Importantes

- **NO uses migraciones** en la configuración inicial, usa `prisma db push`
- El comando `prisma db push` es para desarrollo, para producción usa migraciones
- Siempre ejecuta el seed después de crear las tablas
- Guarda las credenciales de los usuarios iniciales en un lugar seguro