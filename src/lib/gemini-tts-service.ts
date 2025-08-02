import { GoogleGenAI } from "@google/genai";
import { getApiKey } from './apiKeyService';

export const GEMINI_TTS_VOICES = [
  "Kore", "Puck", "Charon", "Fenrir", "Leda", "Callirrhoe", "Aoede", "Enceladus", "Iapetus", "Algieba", "Algenib", "Rasalgethi", "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi", "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat", "Orus", "Autonoe", "Umbriel", "Erinome", "Despina", "Orus"
];

export const GEMINI_TTS_LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' }
];

export interface PodcastSpeaker {
  name: string;
  voice: string; // Debe ser uno de GEMINI_TTS_VOICES
}

export type PodcastMode = 'mono' | 'duo';

export interface GeneratePodcastAudioParams {
  script: string;
  mode: PodcastMode;
  speakers: PodcastSpeaker[];
  language?: 'es' | 'en'; // Nuevo parámetro opcional, por defecto 'es'
}

/**
 * Genera un audio de podcast (WAV) usando Gemini TTS.
 * @param params.script Texto del guion completo
 * @param params.mode 'mono' para monólogo, 'duo' para diálogo
 * @param params.speakers Array de 1 (mono) o 2 (duo) objetos { name, voice }
 * @param params.language Código de idioma ('es' o 'en'), por defecto 'es'
 * @returns Blob de audio WAV
 *
 * Ejemplo de uso:
 *   await generatePodcastAudioWithGemini({
 *     script: 'Bienvenidos al podcast...',
 *     mode: 'duo',
 *     speakers: [
 *       { name: 'Ana', voice: 'Kore' },
 *       { name: 'Luis', voice: 'Puck' }
 *     ],
 *     language: 'es'
 *   });
 */
export async function generatePodcastAudioWithGemini({ script, mode, speakers, language = 'es' }: GeneratePodcastAudioParams): Promise<Blob> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const generationConfig: Record<string, unknown> = {
    responseModalities: ["AUDIO"]
  };
  // Configuración de idioma
  const languageCode = language === 'en' ? 'en-US' : 'es-ES';
  let normalizedScript = script;
  if (mode === 'duo') {
    const [sp1, sp2] = speakers.map(s => s.name.trim());
    // Solo incluir líneas válidas
    const validLine = (line: string) => line.startsWith(`${sp1}:`) || line.startsWith(`${sp2}:`);
    const lines = script.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const filteredLines = lines.filter(validLine);
    if (lines.length !== filteredLines.length) {
      console.warn('Algunas líneas fueron ignoradas porque no empiezan con el nombre exacto del locutor:', lines.filter(l => !validLine(l)));
    }
    normalizedScript = filteredLines.join('\n'); // Solo el diálogo, sin instrucciones
  }

  let speechConfig: Record<string, unknown> = {};
  if (mode === 'mono') {
    speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: speakers[0].voice,
          languageCode
        }
      }
    };
  } else {
    speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          {
            speaker: speakers[0].name.trim(),
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: speakers[0].voice,
                languageCode
              }
            }
          },
          {
            speaker: speakers[1].name.trim(),
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: speakers[1].voice,
                languageCode
              }
            }
          }
        ]
      }
    };
  }
  generationConfig.speechConfig = speechConfig;

  // Usar el método correcto para la versión actual de la librería
  const contents = [{ parts: [{ text: normalizedScript }] }];
  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents,
      config: generationConfig
    });
  } catch (err) {
    // Mostrar error de la API Gemini
    console.error('Error en la petición a Gemini:', err);
    throw new Error('Error en la petición a Gemini: ' + (err instanceof Error ? err.message : String(err)));
  }
  // Depuración: mostrar la respuesta completa para ver el tipo MIME
  console.log('Respuesta completa de Gemini:', response);
  const part = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) {
    throw new Error('Gemini no devolvió audio. Respuesta: ' + JSON.stringify(response));
  }
  // Detectar tipo MIME y extensión
  const mimeType = part.mimeType || 'audio/wav';
  // Decodificar base64 a binario
  const audioBuffer = typeof Buffer !== 'undefined'
    ? Buffer.from(part.data, 'base64')
    : Uint8Array.from(atob(part.data), c => c.charCodeAt(0));
  // Si el tipo MIME es PCM crudo, envolver en WAV
  if (mimeType.startsWith('audio/L16')) {
    // Por defecto: 24000 Hz, 1 canal, 16 bits
    return pcmToWav(audioBuffer, 24000, 1, 16);
  }
  // Usar el tipo MIME correcto
  return new Blob([audioBuffer], { type: mimeType });
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

/**
 * Genera un guion de podcast usando Gemini IA siguiendo la guía oficial de prompts para TTS.
 * @param params.topic Tema del podcast
 * @param params.mode 'mono' o 'duo'
 * @param params.speakers Nombres de los locutores (usados en el prompt para multi-voz)
 * @param params.language Idioma ('es' o 'en'), por defecto 'es'
 * @returns Guion generado como string, listo para TTS
 */
export async function generatePodcastScriptWithGemini({ topic, mode, speakers, language = 'es' }: { topic: string, mode: PodcastMode, speakers: PodcastSpeaker[], language?: 'es' | 'en' }): Promise<string> {
  const apiKey = await getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  let prompt = '';
  if (mode === 'mono') {
    prompt = language === 'en'
      ? `TTS the following monologue for a podcast about: "${topic}". Make it educational, engaging, and suitable for audio. Include an introduction, development, and closing. Use natural language. Do not include any sound effects, music, or stage directions. Only output the spoken text.`
      : `Convierte a voz (TTS) el siguiente monólogo para un podcast sobre: "${topic}". Hazlo educativo, ameno y apto para audio. Incluye introducción, desarrollo y cierre. Usa lenguaje natural. No incluyas efectos de sonido, música ni indicaciones escénicas. Solo el texto hablado.`;
  } else {
    // Para multi-voz, usar nombres de speakers en el prompt
    const [sp1, sp2] = speakers.map(s => s.name.trim());
    prompt = language === 'en'
      ? `TTS the following conversation for a podcast about: "${topic}". The speakers are ${sp1} and ${sp2}. Make it educational, engaging, and suitable for audio. Include an introduction, development, and closing. Use natural language. Format:\n${sp1}: <first line>\n${sp2}: <response>\n... Do not include any sound effects, music, or stage directions. Only output the spoken text.`
      : `Convierte a voz (TTS) el siguiente diálogo para un podcast sobre: "${topic}". Los locutores son ${sp1} y ${sp2}. Hazlo educativo, ameno y apto para audio. Incluye introducción, desarrollo y cierre. Usa lenguaje natural. Formato:\n${sp1}: <primera línea>\n${sp2}: <respuesta>\n... No incluyas efectos de sonido, música ni indicaciones escénicas. Solo el texto hablado.`;
  }
  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt
    });
  } catch (err) {
    console.error('Error generando guion con Gemini:', err);
    throw new Error('Error generando guion con Gemini: ' + (err instanceof Error ? err.message : String(err)));
  }
  // Extraer texto generado
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini no devolvió texto. Respuesta: ' + JSON.stringify(response));
  return text;
}