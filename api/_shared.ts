import { Resend } from 'resend';
import { GoogleGenAI } from "@google/genai";

function sanitizeApiKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return key.replace(/[^\x20-\x7E]/g, "").trim();
}

export const RESEND_KEY = sanitizeApiKey(process.env.RESEND_API_KEY) || "re_beBVqBhS_HLLainSpMJFe6q8exx37YTsm";
export const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

let aiClient: GoogleGenAI | null = null;
export function getAI(): GoogleGenAI {
  if (!aiClient) {
    const rawApiKey = process.env.GEMINI_API_KEY;
    const apiKey = sanitizeApiKey(rawApiKey);
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set your Gemini API key in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper function to retry Gemini requests on 503 (temporary high demand) and fall back to alternative models
export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    model: string;
    contents: any;
    config?: any;
  },
  retries = 3,
  delayMs = 1500
): Promise<any> {
  let attempt = 0;
  let currentModel = params.model;
  const fallbackModels = ['gemini-3.5-flash', 'gemini-2.5-flash'];

  while (true) {
    try {
      console.log(`Sending generateContent request to model: ${currentModel}`);
      return await ai.models.generateContent({
        model: currentModel,
        contents: params.contents,
        config: params.config,
      });
    } catch (error: any) {
      attempt++;
      const errorMessage = (error?.message || error?.toString() || "").toLowerCase();
      const is503 = 
        error?.status === 503 || 
        error?.code === 503 || 
        errorMessage.includes("503") || 
        errorMessage.includes("unavailable") || 
        errorMessage.includes("high demand") || 
        errorMessage.includes("temporary");

      console.warn(`Gemini API error on model ${currentModel} (attempt ${attempt}/${retries + 1}):`, error);

      if (is503 && attempt <= retries) {
        const backoff = delayMs * Math.pow(2, attempt - 1);
        console.warn(`Model ${currentModel} is busy. Retrying in ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      // If it still fails, let's try our fallback models instead of throwing immediately!
      if (fallbackModels.length > 0) {
        const nextModel = fallbackModels.shift();
        if (nextModel && nextModel !== currentModel) {
          console.warn(`Attempting fallback to model: ${nextModel}`);
          currentModel = nextModel;
          attempt = 0; // reset attempts for the fallback model
          continue;
        }
      }

      throw error;
    }
  }
}
