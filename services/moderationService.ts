
import { FORBIDDEN_WORDS } from '../constants';
import { GoogleGenAI } from '@google/genai';

/**
 * Filtro local (Offline e Gratuito)
 */
export const moderateLocalText = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  const isForbidden = FORBIDDEN_WORDS.some(word => lowerText.includes(word.toLowerCase()));
  return !isForbidden;
};

/**
 * Moderação por IA (Google Gemini)
 */
export const moderateAIText = async (text: string): Promise<boolean> => {
  try {
    // Fix: Direct use of process.env.API_KEY and correct initialization format
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Fix: Use generateContent with model name and prompt directly in parameters as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise se a seguinte mensagem de chat é ofensiva, ódio, assédio ou spam. Responda apenas "SAFE" ou "UNSAFE". Mensagem: "${text}"`,
      config: {
        temperature: 0.1,
      }
    });

    // Fix: Access response.text as a property, not a method, and avoid unnecessary nested response checks
    const result = response.text?.trim().toUpperCase() || '';
    return result === 'SAFE';
  } catch (error) {
    console.error('Moderation AI Error:', error);
    return true; 
  }
};
