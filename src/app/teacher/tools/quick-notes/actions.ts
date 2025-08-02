'use server';
import { generateQuickNotesOutput, QuickNotesOutputType } from '@/lib/gemini-quick-notes';

export async function generateNotesWithGemini(notes: string[], outputType: QuickNotesOutputType, customPrompt?: string) {
  return await generateQuickNotesOutput(notes, outputType, customPrompt);
} 