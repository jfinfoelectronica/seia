# Sistema de Seguridad Anti-Inyección de Respuestas

## Descripción General

Este sistema de seguridad está diseñado para detectar y prevenir la inyección de respuestas mediante extensiones de navegador o scripts automatizados en las evaluaciones estudiantiles. El sistema monitorea la entrada del usuario y detecta patrones sospechosos que indican entrada no autorizada.

## Componentes del Sistema

### 1. Hook `useInputSecurity`

**Ubicación:** `src/app/student/evaluation/hooks/useInputSecurity.ts`

**Funcionalidades:**
- **Detección de eventos de teclado:** Registra eventos legítimos de teclado (`keydown`, `keypress`, `input`)
- **Detección de eventos de mouse:** Registra actividad de mouse global (`mousedown`, `mouseup`, `click`)
- **Validación de foco:** Detecta cuando un campo recibe foco sin actividad previa de mouse
- **Validación de cambios de valor:** Compara los cambios de texto con la actividad de teclado reciente
- **Bloqueo de clipboard:** Previene operaciones de copiar, cortar y pegar en campos seguros
- **Detección de patrones sospechosos:**
  - Cambios grandes sin actividad de teclado (>50 caracteres por defecto)
  - Cambios sin ninguna actividad de teclado detectada (>10 caracteres)
  - Múltiples cambios rápidos sin teclado (<50ms entre cambios)
  - **Foco sin actividad de mouse (NUEVO)**
- **Sistema de alertas progresivo:** Permite 2 eventos sospechosos antes de activar la violación de seguridad
- **Observador de mutaciones DOM:** Detecta cambios programáticos directos en el DOM
- **Listeners globales de mouse:** Detecta actividad de mouse en toda la página

**Configuración:**
```typescript
const { validateValueChange, setupKeyboardListeners, setupMutationObserver } = useInputSecurity({
  onSecurityViolation: () => {
    router.push('/student/security-violation');
  },
  suspiciousChangeThreshold: 50, // Caracteres por cambio sospechoso
  timeWindowMs: 100 // Ventana de tiempo para detectar cambios rápidos
});
```

### 2. Componente `SecureTextarea`

**Ubicación:** `src/app/student/evaluation/components/secure-textarea.tsx`

**Funcionalidades:**
- Wrapper del componente `Textarea` estándar
- Configura automáticamente los listeners de seguridad
- Monitorea eventos de teclado y mutaciones DOM
- Integración transparente con el sistema de validación

### 3. Página de Violación de Seguridad

**Ubicación:** `src/app/student/security-violation/page.tsx`

**Funcionalidades:**
- Página en blanco que se muestra cuando se detecta una violación
- Limpia automáticamente `localStorage` y `sessionStorage`
- Previene navegación hacia atrás
- Registra la violación en la consola

## Integración en Componentes

### CodeEditor
- Integrado con `useInputSecurity`
- Configuración más estricta (30 caracteres, 150ms)
- Monitoreo del elemento DOM del editor Monaco

### Página Principal de Evaluación
- Hook de seguridad configurado a nivel de página
- Validación en `handleAnswerChange`
- Uso de `SecureTextarea` para preguntas de texto

## Patrones de Detección

### 1. Foco No Autorizado (NUEVO)
```typescript
// Detecta cuando un campo recibe foco sin actividad previa de mouse
timeSinceLastMouse > timeWindowMs && !mouseActivityDetected
```
**Acción**: Redirección inmediata a página de violación

### 2. Bloqueo de Clipboard
- **Eventos bloqueados**: `copy`, `cut`, `paste`
- **Atajos bloqueados**: `Ctrl+C`, `Ctrl+V`, `Ctrl+X`, `Ctrl+A`
- **Acción en paste/Ctrl+V**: Registra actividad sospechosa y activa violación de seguridad

### 3. Inyección Masiva de Texto
```typescript
// Detecta cuando se insertan >50 caracteres sin actividad de teclado
valueDiff > suspiciousChangeThreshold && timeSinceLastKeyboard > timeWindowMs
```

### 4. Entrada Sin Teclado
```typescript
// Detecta cambios sin ninguna actividad de teclado
!keyboardActivityDetected && valueDiff > 10
```

### 5. Cambios Rápidos Automatizados
```typescript
// Detecta múltiples cambios rápidos sin teclado
timeSinceLastChange < 50 && !keyboardActivityDetected && valueDiff > 5
```

## Flujo de Seguridad

1. **Usuario interactúa normalmente:**
   - Eventos de mouse se registran globalmente
   - Usuario hace clic para enfocar un campo
   - Eventos de teclado se registran
   - Cambios de valor se validan como legítimos
   - Respuesta se actualiza normalmente

2. **Script automatizado intenta enfocar campo:**
   - No se detectan eventos de mouse previos
   - Campo recibe foco programáticamente
   - Sistema detecta foco sospechoso
   - **Redirección inmediata a página de violación**

3. **Extensión inyecta respuesta:**
   - No se detectan eventos de teclado
   - Cambio grande de valor sin actividad de teclado
   - Sistema registra evento sospechoso

4. **Múltiples violaciones:**
   - Después de 2 eventos sospechosos (para cambios de valor)
   - Redirección automática a página de violación
   - Limpieza de datos sensibles

## Configuración por Tipo de Input

### Textarea (Preguntas de Texto)
- Umbral: 50 caracteres
- Ventana de tiempo: 100ms
- Más permisivo para escritura natural

### Monaco Editor (Código)
- Umbral: 30 caracteres
- Ventana de tiempo: 150ms
- Más estricto debido a la naturaleza del código

## Limitaciones y Consideraciones

### Lo que SÍ detecta:
- ✅ **Scripts maliciosos** que intentan inyectar texto automáticamente
- ✅ **Extensiones de navegador** que modifican campos de entrada
- ✅ **Herramientas de automatización** (Selenium, Puppeteer, etc.)
- ✅ **Bots** que intentan completar formularios
- ✅ **Inyección de código** a través de consola del navegador
- ✅ **Foco programático** sin interacción del ratón
- ✅ **Scripts que enfocan campos** automáticamente
- ✅ **Bots que intentan interactuar** sin ratón
- ✅ **Operaciones de clipboard** (copiar, cortar, pegar)
- ✅ **Atajos de teclado** para clipboard (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A)
- ✅ **Pegado desde portapapeles** externo

### Lo que NO puede detectar:
- ❌ Extensiones que simulan eventos de teclado reales
- ❌ Entrada muy lenta que imita escritura humana
- ❌ Modificaciones a nivel de sistema operativo
- ❌ Herramientas de accesibilidad legítimas

## Registro y Monitoreo

### Logs de Seguridad
```javascript
// Detección de foco no autorizado
console.warn('[SECURITY] Foco sospechoso detectado en textarea - sin actividad de mouse reciente');
console.warn('[SECURITY] Foco sospechoso detectado en monaco - sin actividad de mouse reciente');
console.error('[SECURITY] Violación de seguridad por foco no autorizado - Redirigiendo...');

// Detección de clipboard
console.warn('[SECURITY] Intento de copiar en textarea bloqueado');
console.warn('[SECURITY] Intento de cortar en textarea bloqueado');
console.warn('[SECURITY] Intento de pegar en textarea bloqueado');
console.warn('[SECURITY] Intento de copiar en Monaco bloqueado');
console.warn('[SECURITY] Intento de cortar en Monaco bloqueado');
console.warn('[SECURITY] Intento de pegar en Monaco bloqueado');
console.error('[SECURITY] Violación de seguridad por Ctrl+V en textarea - Redirigiendo...');
console.error('[SECURITY] Violación de seguridad por Ctrl+V en Monaco - Redirigiendo...');

// Detección de inyección de texto
console.warn('[SECURITY] Cambio sospechoso detectado:', { valueDiff, timeSinceLastKey, keyboardActivity });
console.error('[SECURITY] Violación de seguridad detectada - Redirigiendo...');
```

El sistema registra eventos en la consola del navegador:
```javascript
// Detección de cambios sospechosos
console.warn('[SECURITY] Actividad sospechosa detectada en textarea:', {
  valueDiff: 75,
  timeSinceLastKeyboard: 200,
  keyboardActivityDetected: false,
  suspiciousCount: 1
});

// Detección de foco no autorizado (NUEVO)
console.warn('[SECURITY] Foco sospechoso detectado en monaco:', {
  timeSinceLastMouse: 300,
  mouseActivityDetected: false,
  suspiciousCount: 1
});

// Violación de seguridad
console.error('[SECURITY] Violación de seguridad detectada - Redirigiendo...');
console.error('[SECURITY] Violación de seguridad por foco no autorizado - Redirigiendo...');
```

## Mantenimiento

### Ajustar Sensibilidad
Para hacer el sistema más o menos estricto, modifica los parámetros:
- `suspiciousChangeThreshold`: Número de caracteres que activa la detección
- `timeWindowMs`: Ventana de tiempo para considerar actividad de teclado válida
- Número de eventos sospechosos antes de la violación (actualmente 2)

### Agregar Nuevos Tipos de Input
1. Crear wrapper similar a `SecureTextarea`
2. Integrar `setupKeyboardListeners` y `setupMutationObserver`
3. Configurar validación en el handler de cambios

## Impacto en la Experiencia del Usuario

- **Usuario normal:** Sin impacto, funcionalidad transparente
- **Copiar/pegar legítimo:** Permitido si hay actividad de teclado reciente
- **Herramientas de accesibilidad:** Pueden requerir ajustes en la configuración
- **Violaciones detectadas:** Redirección inmediata sin posibilidad de recuperación