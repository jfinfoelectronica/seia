import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './apiKeyService';

export type QuickNotesOutputType =
  | 'summary'
  | 'email'
  | 'bullets'
  | 'report'
  | 'blogpost'
  | 'motivation'
  | 'tasks'
  | 'letter'
  | 'custom';

export async function generateQuickNotesOutput(notes: string[], outputType: QuickNotesOutputType, customPrompt?: string): Promise<string> {
  if (!notes || notes.length === 0) {
    return 'No se proporcionaron notas para procesar.';
  }

  const apiKey = await getApiKey();
  const genAI = new GoogleGenAI({ apiKey });
  const model = "gemini-2.0-flash";

  let prompt = '';
  switch (outputType) {
    case 'summary':
      prompt = `Eres un asistente experto en redacción. Recibe una lista de notas rápidas y genera un resumen bien redactado, coherente y profesional en español. SOLO ENTREGA UNA OPCIÓN, NO INCLUYAS VARIANTES NI OPCIONES MÚLTIPLES.\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}\n\nResumen:`;
      break;
    case 'email':
      prompt = `Eres un asistente experto en comunicación. Recibe una lista de notas rápidas y redacta un correo formal en español, dirigido a un colega, superior o cliente, resumiendo los puntos clave. SOLO ENTREGA UN CORREO, NO INCLUYAS VARIAS OPCIONES NI VARIANTES.\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}\n\nCorreo:`;
      break;
    case 'bullets':
      prompt = `Eres un asistente de productividad. Recibe una lista de notas rápidas y devuélvelas como una lista de puntos clave claros y concisos en español. SOLO ENTREGA UNA LISTA, NO INCLUYAS VARIANTES.\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}\n\nPuntos clave:`;
      break;
    case 'report':
      prompt = `Eres un asistente profesional. Recibe una lista de notas rápidas y genera un informe estructurado y formal en español, con introducción, desarrollo y conclusión. SOLO ENTREGA UN INFORME, NO INCLUYAS VARIANTES.\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}\n\nInforme:`;
      break;
    case 'blogpost':
      prompt = `Eres un redactor de blogs. Recibe una lista de notas rápidas y escribe un post de blog atractivo y bien redactado en español, usando un tono cercano y explicativo. SOLO ENTREGA UN POST, NO INCLUYAS VARIANTES.\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}\n\nPost de blog:`;
      break;
    case 'motivation':
      prompt = `Eres un coach motivacional. Recibe una lista de notas rápidas y genera un mensaje motivacional o inspirador en español, usando las ideas de las notas. SOLO ENTREGA UN MENSAJE, NO INCLUYAS VARIANTES.\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}\n\nMensaje motivacional:`;
      break;
    case 'tasks':
      prompt = `Eres un asistente de organización. Recibe una lista de notas rápidas y conviértelas en una lista de tareas claras y accionables en español. SOLO ENTREGA UNA LISTA, NO INCLUYAS VARIANTES.\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}\n\nLista de tareas:`;
      break;
    case 'letter':
      prompt = `Eres un asistente experto en redacción de cartas. Recibe una lista de notas rápidas y redacta una carta formal en español, bien estructurada y cordial. SOLO ENTREGA UNA CARTA, NO INCLUYAS VARIANTES.\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}\n\nCarta:`;
      break;
    case 'custom':
      prompt = (customPrompt?.trim() ? `${customPrompt.trim()}\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}` : `Eres un asistente flexible. Recibe una lista de notas rápidas y genera una salida útil y bien redactada en español según la necesidad del usuario. SOLO ENTREGA UNA OPCIÓN, NO INCLUYAS VARIANTES.\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}\n\nSalida:`);
      break;
    default:
      prompt = `Recibe una lista de notas rápidas y genera un resumen profesional en español. SOLO ENTREGA UNA OPCIÓN, NO INCLUYAS VARIANTES.\n\nNOTAS:\n${notes.map(n => `- ${n}`).join('\n')}\n\nResumen:`;
  }

  const response = await genAI.models.generateContent({
    model,
    contents: prompt
  });

  // Siempre devolver solo una variante, nunca variantes múltiples
  return response.text || 'No se pudo generar la salida.';
}

/**
 * Resume un texto largo usando Gemini, con un prompt dedicado a resumen profesional en español.
 * @param text Texto a resumir
 * @returns Resumen generado por Gemini
 */
export async function generateGeminiSummary(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return 'No se proporcionó texto para resumir.';
  }
  const apiKey = await getApiKey();
  const genAI = new GoogleGenAI({ apiKey });
  const model = "gemini-2.0-flash";
  const prompt = `Eres un asistente experto en redacción. Recibe el siguiente texto y genera un resumen bien redactado, coherente y profesional en español.\n\nTEXTO:\n${text}\n\nResumen:`;
  const response = await genAI.models.generateContent({ model, contents: prompt });
  return response.text || 'No se pudo generar el resumen.';
}