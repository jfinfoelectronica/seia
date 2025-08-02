import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './apiKeyService';

export async function translateTextWithGemini(text: string, targetLang: string): Promise<string> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";
  const prompt = `Traduce SOLO el siguiente texto al idioma ${targetLang}. Devuelve únicamente la traducción, sin explicaciones, sin prefijos, sin detalles.\n\n${text}`;
  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });
  return response.text || '';
}

export async function transcribeAndTranslateAudioWithGemini(
  audioBase64: string,
  targetLang: string,
  options?: { timestamps?: boolean }
): Promise<{ transcript: string, translation: string }> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";
  const timestamps = options?.timestamps;
  // El prompt pide marcas de tiempo, pero la transcripción debe ser fiel al audio, sin agregar texto extra ni nombres de hablante
  const prompt = timestamps
    ? `Transcribe el siguiente audio (en cualquier idioma) y luego traduce la transcripción al idioma ${targetLang}. Si es posible, incluye marcas de tiempo (hh:mm:ss) SOLO donde el audio real lo permita, sin agregar texto ni nombres que no estén en el audio. Devuelve solo la transcripción y la traducción, separadas claramente. Ejemplo:\nTranscripción: ...\nTraducción: ...`
    : `Transcribe el siguiente audio (en cualquier idioma) y luego traduce la transcripción al idioma ${targetLang}. Devuelve solo la transcripción y la traducción, separadas claramente. Ejemplo:\nTranscripción: ...\nTraducción: ...`;
  const response = await ai.models.generateContent({
    model,
    contents: [
      { role: 'user', parts: [ { text: prompt }, { inlineData: { mimeType: "audio/wav", data: audioBase64 } } ] }
    ]
  });
  const text = response.text || '';
  const transcriptMatch = text.match(/Transcripci[óo]n\s*:\s*([\s\S]*?)Traducci[óo]n\s*:/i);
  const translationMatch = text.match(/Traducci[óo]n\s*:\s*([\s\S]*)/i);
  return {
    transcript: transcriptMatch ? transcriptMatch[1].trim() : '',
    translation: translationMatch ? translationMatch[1].trim() : '',
  };
}

/**
 * Genera audio sincronizado en otro idioma usando Gemini TTS (idéntico a podcast).
 * @param text Texto traducido (puede incluir marcas de tiempo).
 * @param lang Código de idioma destino (ej: 'es-ES', 'en-US').
 * @param voiceName Nombre de la voz Gemini (ej: 'Kore', 'Puck').
 * @returns Blob de audio reproducible en navegador
 */
export async function generateTTSWithGemini(
  text: string,
  lang: string,
  voiceName: string = 'Kore'
): Promise<Blob> {
  // Usa el texto exactamente como fue transcrito, sin agregar instrucciones de estilo
  const ttsText = text;
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-2.5-flash-preview-tts';
  const languageCode = lang === 'en' || lang === 'en-US' ? 'en-US' : 'es-ES';
  const speechConfig = {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName,
        languageCode
      }
    }
  };
  const generationConfig: Record<string, unknown> = {
    responseModalities: ["AUDIO"],
    speechConfig
  };
  const contents = [{ parts: [{ text: ttsText }] }];
  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents,
      config: generationConfig
    });
  } catch (err) {
    console.error('Error en la petición a Gemini:', err);
    throw new Error('Error en la petición a Gemini: ' + (err instanceof Error ? err.message : String(err)));
  }
  const part = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) {
    throw new Error('Gemini no devolvió audio. Respuesta: ' + JSON.stringify(response));
  }
  const mimeType = part.mimeType || 'audio/wav';
  const audioBuffer = typeof Buffer !== 'undefined'
    ? Buffer.from(part.data, 'base64')
    : Uint8Array.from(atob(part.data), c => c.charCodeAt(0));
  if (mimeType.startsWith('audio/L16')) {
    return pcmToWav(audioBuffer, 24000, 1, 16);
  }
  return new Blob([audioBuffer], { type: mimeType });
}

/**
 * Transcribe, traduce y opcionalmente genera audio sincronizado en otro idioma.
 * @param audioBase64 Audio original en base64
 * @param targetLang Idioma destino (ej: 'inglés', 'en-US')
 * @param options Opciones: timestamps, ttsVoice, returnAudio
 */
export async function transcribeTranslateAndTTSWithGemini(
  audioBase64: string,
  targetLang: string,
  options?: { timestamps?: boolean; ttsVoice?: string; returnAudio?: boolean }
): Promise<{ transcript: string, translation: string, audio?: Blob }> {
  // Primero transcribe y traduce
  const { transcript, translation } = await transcribeAndTranslateAudioWithGemini(audioBase64, targetLang, { timestamps: options?.timestamps });
  let audio: Blob | undefined = undefined;
  if (options?.returnAudio && translation) {
    // Genera el audio sincronizado en el idioma destino
    audio = await generateTTSWithGemini(translation, targetLang, options.ttsVoice || 'Kore');
  }
  return { transcript, translation, audio };
}

/**
 * Genera audio TTS sincronizado por marcas de tiempo.
 * @param translation Texto traducido con marcas de tiempo (ej: [00:00:01] Hola...)
 * @param lang Código de idioma destino
 * @param voiceName Nombre de la voz Gemini
 * @returns Blob de audio concatenado
 */
export async function generateSegmentedTTSWithGemini(
  translation: string,
  lang: string,
  voiceName: string = 'Kore'
): Promise<Blob> {
  // Extrae segmentos con timestamp: [hh:mm:ss] texto
  const segmentRegex = /\[(\d{2}:\d{2}:\d{2})\]\s*([^\[]+)/g;
  const matches = Array.from(translation.matchAll(segmentRegex));
  if (!matches.length) {
    // Si no hay segmentos, usa el texto completo
    return generateTTSWithGemini(translation, lang, voiceName);
  }
  // Genera TTS para cada segmento
  const audioBlobs: Blob[] = [];
  for (const match of matches) {
    const text = match[2].trim();
    if (text) {
      const audio = await generateTTSWithGemini(text, lang, voiceName);
      audioBlobs.push(audio);
    }
  }
  // Une los blobs en uno solo (WAV simple, no PCM)
  const mergedBuffer = await mergeWavBlobs(audioBlobs);
  return new Blob([mergedBuffer], { type: 'audio/wav' });
}

// Une varios blobs WAV en uno solo (simple, sin validación de headers)
async function mergeWavBlobs(blobs: Blob[]): Promise<ArrayBuffer> {
  // Lee todos los ArrayBuffer
  const buffers = await Promise.all(blobs.map(b => b.arrayBuffer()));
  // Quita headers de todos menos el primero
  let totalLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalLength += i === 0 ? buffers[i].byteLength : buffers[i].byteLength - 44;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    const buf = new Uint8Array(buffers[i]);
    if (i === 0) {
      result.set(buf, offset);
      offset += buf.length;
    } else {
      result.set(buf.subarray(44), offset);
      offset += buf.length - 44;
    }
  }
  // Corrige el tamaño total en el header WAV
  const view = new DataView(result.buffer);
  view.setUint32(4, result.length - 8, true); // file size
  view.setUint32(40, result.length - 44, true); // data chunk size
  return result.buffer;
}

// Convierte un buffer PCM (L16) a un Blob WAV reproducible en navegador
function pcmToWav(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Blob {
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF 'RIFF'
  view.setUint32(0, 0x52494646, false);
  // file length minus RIFF identifier length and file description length
  view.setUint32(4, 36 + pcmData.length, true);
  // RIFF type 'WAVE'
  view.setUint32(8, 0x57415645, false);
  // format chunk identifier 'fmt '
  view.setUint32(12, 0x666d7420, false);
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, byteRate, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitsPerSample, true);
  // data chunk identifier 'data'
  view.setUint32(36, 0x64617461, false);
  // data chunk length
  view.setUint32(40, pcmData.length, true);

  return new Blob([wavHeader, pcmData], { type: 'audio/wav' });
}
