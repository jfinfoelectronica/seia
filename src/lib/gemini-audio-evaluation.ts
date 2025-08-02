import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import { getApiKey } from './apiKeyService';

export interface AudioSegmentEvaluation {
  start: string; // "MM:SS"
  end: string;   // "MM:SS"
  transcript: string;
  evaluations: { criterio: string; valor: string; }[];
  comments: string;
}

export interface AudioEvaluationResult {
  segments: AudioSegmentEvaluation[];
  overallComments: string;
}

export interface AudioRubricCriterion {
  criterio: string;
  calificacion: number; // 0.0 a 5.0
  retroalimentacion: string;
  porcentaje?: number;
}

export interface AudioFlexibleEvaluationResult {
  rubrica: AudioRubricCriterion[];
  calificacionTotal: number;
  retroalimentacionGeneral: string;
  modo: 'libre' | 'criterios';
}

/**
 * Evalúa un audio usando Gemini según criterios y marcas de tiempo.
 * @param audio Archivo de audio (File o Blob)
 * @param criterios Lista de criterios de evaluación
 * @returns Evaluación estructurada por segmentos
 */
export async function evaluateAudioWithGemini(audio: File | Blob, criterios: string[]): Promise<AudioEvaluationResult> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  // 1. Subir el archivo de audio
  const myfile = await ai.files.upload({
    file: audio,
    config: { mimeType: (audio as File).type || 'audio/mp3' },
  });
  if (!myfile.uri || !myfile.mimeType) {
    throw new Error('No se pudo obtener la URI o el tipo MIME del archivo subido.');
  }
  // 2. Construir el prompt
  const criteriosStr = criterios.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const prompt = `Evalúa el siguiente audio según estos criterios:\n${criteriosStr}\nDivide la evaluación por marcas de tiempo relevantes (ejemplo: cada 30 segundos o cuando cambie el tema).\nPara cada segmento, proporciona:\n- Rango de tiempo (inicio y fin, formato MM:SS)\n- Transcripción\n- Evaluación de cada criterio (escala 1-5 o texto)\n- Comentarios específicos\nAl final, agrega comentarios generales sobre el desempeño.\nResponde ÚNICAMENTE en formato JSON con la estructura:\n{ segments: [ { start, end, transcript, evaluations: [{criterio, valor}], comments } ], overallComments }`;
  // 3. Llamar a Gemini
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([
      createPartFromUri(myfile.uri, myfile.mimeType),
      prompt,
    ]),
  });
  // 4. Parsear la respuesta (espera JSON estructurado)
  const text = response.text || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AudioEvaluationResult;
    }
    throw new Error('No se pudo extraer JSON de la respuesta de Gemini.');
  } catch (e) {
    throw new Error('Error al procesar la respuesta de Gemini: ' + (e as Error).message + '\nRespuesta: ' + text);
  }
}

/**
 * Corrige la redacción de un criterio de evaluación usando Gemini.
 * @param contenido Texto del criterio a corregir
 * @returns Criterio corregido
 */
export async function corregirRedaccionCriterio(contenido: string): Promise<string> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Corrige la redacción del siguiente criterio de evaluación para que sea claro, formal y específico. Devuelve solo el texto corregido, sin explicaciones ni comillas.\nCriterio: ${contenido}`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([prompt]),
  });
  return (response.text || '').trim();
}

/**
 * Genera criterios de evaluación estructurados a partir de un prompt usando Gemini.
 * @param prompt Instrucción o contexto para generar los criterios
 * @returns Array de criterios [{descripcion, minutos, segundos, porcentaje}]
 */
export async function generateCriteriosWithGemini(prompt: string): Promise<{descripcion: string, minutos: string, segundos: string, porcentaje: string}[]> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const fullPrompt = `Genera una lista de criterios de evaluación para analizar un audio. Cada criterio debe tener:
- descripcion (máx 200 caracteres)
- minutos (solo números, 2 dígitos, si no se indica asigna automáticamente de forma secuencial)
- segundos (solo números, 2 dígitos, si no se indica asigna automáticamente)
- porcentaje (solo números, 0-100, si no se indica distribuye equitativamente entre los criterios)
Si el usuario indica marcas de tiempo o porcentaje, respétalos. Devuelve SOLO un array JSON de objetos con estos campos, sin explicaciones ni texto extra.\nContexto: ${prompt}`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([fullPrompt]),
  });
  const text = response.text || '';
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const arr = JSON.parse(match[0]);
      // Validar/completar campos si faltan
      if (Array.isArray(arr)) {
        // Asignar tiempos y porcentajes automáticos si faltan
        const total = arr.length;
        const defaultPorc = Math.floor(100 / total);
        let sobrante = 100 - defaultPorc * total;
        let min = 0;
        for (let i = 0; i < arr.length; i++) {
          arr[i].descripcion = arr[i].descripcion?.slice(0, 200) || `Criterio ${i+1}`;
          arr[i].minutos = arr[i].minutos?.padStart(2, '0') || String(Math.floor(min/60)).padStart(2, '0');
          arr[i].segundos = arr[i].segundos?.padStart(2, '0') || String(min%60).padStart(2, '0');
          if (!arr[i].porcentaje || isNaN(Number(arr[i].porcentaje))) {
            arr[i].porcentaje = String(defaultPorc + (sobrante > 0 ? 1 : 0));
            if (sobrante > 0) sobrante--;
          } else {
            arr[i].porcentaje = String(Math.max(0, Math.min(100, Number(arr[i].porcentaje))));
          }
          min += 60; // asigna 1 min por criterio si no hay tiempo
        }
      }
      return arr;
    }
    throw new Error('No se pudo extraer el array JSON de criterios.');
  } catch (e) {
    throw new Error('Error al procesar la respuesta de Gemini: ' + (e as Error).message + '\nRespuesta: ' + text);
  }
}

/**
 * Evalúa un audio usando Gemini en modo libre o con criterios, con opciones de marcas de tiempo y porcentaje.
 * @param audio Archivo de audio (File o Blob)
 * @param opciones { modo: 'libre' | 'criterios', criterios?: {descripcion, minutos, segundos, porcentaje}[], usarMarcasDeTiempo?: boolean, usarPorcentaje?: boolean }
 * @returns Rúbrica autocalificada, retroalimentación y calificación total
 */
export async function evaluateAudioFlexibleWithGemini(
  audio: File | Blob,
  opciones: {
    modo: 'libre' | 'criterios',
    criterios?: { descripcion: string; minutos: string; segundos: string; porcentaje: string }[],
    usarMarcasDeTiempo?: boolean,
    usarPorcentaje?: boolean
  }
): Promise<AudioFlexibleEvaluationResult> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const myfile = await ai.files.upload({
    file: audio,
    config: { mimeType: (audio as File).type || 'audio/mp3' },
  });
  if (!myfile.uri || !myfile.mimeType) {
    throw new Error('No se pudo obtener la URI o el tipo MIME del archivo subido.');
  }
  let prompt = '';
  if (opciones.modo === 'libre') {
    prompt = `Evalúa el siguiente audio de manera global, como si fueras un jurado experto. Genera una rúbrica autocalificada con 3 a 5 criterios relevantes (elige los más importantes para el contexto), asigna una calificación de 0.0 a 5.0 para cada criterio, y da retroalimentación específica para cada uno. Al final, da una retroalimentación general y una calificación total (promedio de criterios). Responde SOLO en JSON:
{
  rubrica: [ { criterio, calificacion, retroalimentacion } ],
  calificacionTotal,
  retroalimentacionGeneral,
  modo
}`;
  } else {
    // Con criterios personalizados
    const criteriosStr = (opciones.criterios || []).map((c, i) => {
      let base = `${i+1}. ${c.descripcion}`;
      if (opciones.usarMarcasDeTiempo) base += ` (desde ${c.minutos.padStart(2,'0')}:${c.segundos.padStart(2,'0')})`;
      if (opciones.usarPorcentaje) base += ` [${c.porcentaje}%]`;
      return base;
    }).join('\n');
    prompt = `Evalúa el siguiente audio según estos criterios:\n${criteriosStr}\nPara cada criterio, asigna una calificación de 0.0 a 5.0 y da retroalimentación específica. ${opciones.usarMarcasDeTiempo ? 'Ten en cuenta las marcas de tiempo para cada criterio.' : ''} ${opciones.usarPorcentaje ? 'Calcula la calificación total ponderando cada criterio por su porcentaje.' : 'La calificación total es el promedio de los criterios.'} Al final, da una retroalimentación general y la calificación total. Responde SOLO en JSON:\n{ rubrica: [ { criterio, calificacion, retroalimentacion${opciones.usarPorcentaje ? ', porcentaje' : ''} } ], calificacionTotal, retroalimentacionGeneral, modo }`;
  }
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([
      createPartFromUri(myfile.uri, myfile.mimeType),
      prompt,
    ]),
  });
  const text = response.text || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AudioFlexibleEvaluationResult;
    }
    throw new Error('No se pudo extraer JSON de la respuesta de Gemini.');
  } catch (e) {
    throw new Error('Error al procesar la respuesta de Gemini: ' + (e as Error).message + '\nRespuesta: ' + text);
  }
}

/**
 * Redistribuye los tiempos y porcentajes de los criterios de evaluación según la duración total del audio usando Gemini.
 * @param criterios Array de criterios actuales
 * @param duracionTotal Segundos totales del audio
 * @returns Array de criterios con tiempos y porcentajes redistribuidos
 */
export async function redistributeCriteriosWithGemini(
  criterios: { descripcion: string; minutos: string; segundos: string; porcentaje: string }[],
  duracionTotal: number
): Promise<{ descripcion: string; minutos: string; segundos: string; porcentaje: string }[]> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const criteriosStr = criterios.map((c, i) => `${i+1}. ${c.descripcion}`).join('\n');
  const prompt = `Tienes una lista de criterios de evaluación para un audio de ${Math.floor(duracionTotal/60)} minutos y ${duracionTotal%60} segundos. Redistribuye las marcas de tiempo (minutos y segundos de inicio para cada criterio, en formato 2 dígitos) y el porcentaje de evaluación de forma proporcional y equilibrada entre los criterios. Devuelve SOLO un array JSON de objetos con los campos: descripcion, minutos, segundos, porcentaje.\nCriterios:\n${criteriosStr}`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent([prompt]),
  });
  const text = response.text || '';
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('No se pudo extraer el array JSON de criterios redistribuidos.');
  } catch (e) {
    throw new Error('Error al procesar la respuesta de Gemini: ' + (e as Error).message + '\nRespuesta: ' + text);
  }
} 