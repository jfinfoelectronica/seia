// ⚠️ SCRIPT DE PRUEBA DE SEGURIDAD ⚠️
// Este script demuestra las capacidades de detección del sistema de seguridad
// Las primeras acciones activarán la protección de seguridad

console.log('🔒 Iniciando pruebas de seguridad...');

// 1. PRUEBA DE FOCO NO AUTORIZADO (ACTIVARÁ PROTECCIÓN)
console.log('📍 Prueba 1: Foco no autorizado en textarea');
setTimeout(() => {
  const textarea = document.querySelector('textarea');
  if (textarea) {
    textarea.focus(); // Esto activará la detección de foco no autorizado
    console.log('✅ Foco aplicado a textarea');
  }
}, 1000);

// 2. PRUEBA DE CLIPBOARD - PEGADO (ACTIVARÁ PROTECCIÓN)
console.log('📋 Prueba 2: Intento de pegado programático');
setTimeout(() => {
  const textarea = document.querySelector('textarea');
  if (textarea) {
    // Simular evento de pegado
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer()
    });
    pasteEvent.clipboardData.setData('text/plain', 'Texto pegado programáticamente');
    textarea.dispatchEvent(pasteEvent);
    console.log('✅ Evento de pegado disparado');
  }
}, 2000);

// 3. PRUEBA DE ATAJOS DE TECLADO - CTRL+V (ACTIVARÁ PROTECCIÓN)
console.log('⌨️ Prueba 3: Atajo Ctrl+V programático');
setTimeout(() => {
  const textarea = document.querySelector('textarea');
  if (textarea) {
    const ctrlVEvent = new KeyboardEvent('keydown', {
      key: 'v',
      code: 'KeyV',
      ctrlKey: true,
      bubbles: true
    });
    textarea.dispatchEvent(ctrlVEvent);
    console.log('✅ Ctrl+V programático disparado');
  }
}, 3000);

// 4. PRUEBA DE INYECCIÓN DE TEXTO (ACTIVARÁ PROTECCIÓN)
console.log('💉 Prueba 4: Inyección masiva de texto');
setTimeout(() => {
  const textarea = document.querySelector('textarea');
  if (textarea) {
    const largeText = 'Este es un texto muy largo que simula una inyección automática de contenido. '.repeat(10);
    textarea.value = largeText;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('✅ Texto inyectado programáticamente');
  }
}, 4000);

// 5. PRUEBA DE FOCO EN MONACO (ACTIVARÁ PROTECCIÓN)
console.log('🎯 Prueba 5: Foco no autorizado en Monaco');
setTimeout(() => {
  const monacoEditor = document.querySelector('.monaco-editor textarea');
  if (monacoEditor) {
    monacoEditor.focus();
    console.log('✅ Foco aplicado a Monaco');
  }
}, 5000);

// 6. SIMULACIÓN DE INTERACCIÓN LEGÍTIMA (NO ACTIVARÁ PROTECCIÓN)
console.log('👤 Prueba 6: Simulación de interacción legítima');
setTimeout(() => {
  // Simular actividad de ratón primero
  const mouseEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    isTrusted: true
  });
  document.dispatchEvent(mouseEvent);
  
  setTimeout(() => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      // Simular escritura normal
      textarea.focus();
      textarea.value = 'Texto escrito normalmente';
      
      // Simular eventos de teclado
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'a',
        bubbles: true,
        isTrusted: true
      });
      textarea.dispatchEvent(keyEvent);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.log('✅ Interacción legítima simulada');
    }
  }, 200);
}, 6000);

console.log('⚠️ Las pruebas 1-5 deberían activar la protección de seguridad');
console.log('✅ La prueba 6 simula interacción normal y NO debería activar protección');