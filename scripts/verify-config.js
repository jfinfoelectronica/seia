#!/usr/bin/env node

/**
 * Script para verificar la configuración de autenticación
 * Útil para diagnosticar problemas en Vercel
 */

const requiredEnvVars = [
  'AUTH_SECRET',
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'AUTH_URL'
];

const optionalEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'ENCRYPTION_KEY'
];

console.log('🔍 Verificando configuración de autenticación...\n');

// Verificar variables de entorno requeridas
console.log('📋 Variables de entorno requeridas:');
let missingRequired = [];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName === 'AUTH_SECRET' ? '[OCULTO]' : value}`);
  } else {
    console.log(`❌ ${varName}: NO CONFIGURADA`);
    missingRequired.push(varName);
  }
});

// Verificar variables opcionales
console.log('\n📋 Variables de entorno opcionales:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('SECRET') ? '[OCULTO]' : value}`);
  } else {
    console.log(`⚠️  ${varName}: NO CONFIGURADA`);
  }
});

// Verificar configuración específica de Vercel
console.log('\n🚀 Configuración de Vercel:');
const vercelVars = ['VERCEL', 'VERCEL_ENV', 'VERCEL_URL'];
vercelVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`ℹ️  ${varName}: NO CONFIGURADA (normal en desarrollo local)`);
  }
});

// Verificar URLs
console.log('\n🌐 Verificación de URLs:');
const nextauthUrl = process.env.NEXTAUTH_URL;
const authUrl = process.env.AUTH_URL;

if (nextauthUrl) {
  try {
    new URL(nextauthUrl);
    console.log(`✅ NEXTAUTH_URL es una URL válida: ${nextauthUrl}`);
  } catch (error) {
    console.log(`❌ NEXTAUTH_URL no es una URL válida: ${nextauthUrl}`);
  }
} else {
  console.log('❌ NEXTAUTH_URL no está configurada');
}

if (authUrl) {
  try {
    new URL(authUrl);
    console.log(`✅ AUTH_URL es una URL válida: ${authUrl}`);
  } catch (error) {
    console.log(`❌ AUTH_URL no es una URL válida: ${authUrl}`);
  }
} else {
  console.log('❌ AUTH_URL no está configurada');
}

// Verificar coherencia entre URLs
if (nextauthUrl && authUrl && nextauthUrl !== authUrl) {
  console.log('⚠️  NEXTAUTH_URL y AUTH_URL son diferentes. Esto puede causar problemas.');
}

// Resumen
console.log('\n📊 Resumen:');
if (missingRequired.length === 0) {
  console.log('✅ Todas las variables requeridas están configuradas');
} else {
  console.log(`❌ Faltan ${missingRequired.length} variables requeridas: ${missingRequired.join(', ')}`);
}

// Recomendaciones para Vercel
console.log('\n💡 Recomendaciones para Vercel:');
console.log('1. Asegúrate de que todas las variables estén configuradas en el dashboard de Vercel');
console.log('2. NEXTAUTH_URL debe apuntar a tu dominio de producción (ej: https://tu-app.vercel.app)');
console.log('3. AUTH_URL debe ser igual a NEXTAUTH_URL en producción');
console.log('4. Redeploya después de cambiar variables de entorno');
console.log('5. Verifica que el dominio esté correctamente configurado en Google OAuth (si usas Google)');

// Comandos útiles
console.log('\n🛠️  Comandos útiles:');
console.log('- Verificar salud: curl https://tu-app.vercel.app/api/health');
console.log('- Ver logs de Vercel: vercel logs');
console.log('- Redeploy: vercel --prod');

process.exit(missingRequired.length > 0 ? 1 : 0);