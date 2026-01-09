
import { FORBIDDEN_WORDS } from '../constants';
import { GoogleGenAI } from '@google/genai';

export const moderateLocalText = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !FORBIDDEN_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

export const moderateAIText = async (text: string): Promise<boolean> => {
  try {
    // A chave deve vir obrigatoriamente do process.env.API_KEY injetado
    // Fix: Using named parameter for GoogleGenAI initialization.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Fix: Using generateContent with correct model name and prompt as per guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise se a seguinte mensagem é imprópria: "${text}". Responda apenas SAFE ou UNSAFE.`,
      config: {
        temperature: 0.1,
      }
    });

    // Fix: Correctly access the .text property from the GenerateContentResponse.
    const result = (response.text || '').trim().toUpperCase();
    return result === 'SAFE';
  } catch (error) {
    console.error('Moderation Error:', error);
    return true; // Fallback para não travar o app se a IA falhar
  }
};
